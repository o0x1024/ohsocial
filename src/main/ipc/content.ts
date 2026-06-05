import { ipcMain } from 'electron'
import type { ContentCreateInput, ContentUpdateInput } from '../../shared/types/content'
import { resolveContentPlatformIds } from '../../shared/content-platform'
import { contentDAO, platformAccountDAO, topicDAO, writingStyleDAO } from '../db'
import { modelService } from '../ai/model-service'
import { runWithAiProgress } from './ai-progress-runner'

function streamCallbacks(
  progress: import('../ai/ai-progress').AiProgressEmitter | undefined,
  legacy: Record<string, unknown>
) {
  return { progress, deltaLegacy: legacy, signal: progress?.signal }
}

function platformIdsForContent(content: NonNullable<ReturnType<typeof contentDAO.getById>>): string[] {
  const topic = content.topicId ? topicDAO.getById(content.topicId) : undefined
  return resolveContentPlatformIds({
    platform: content.platform,
    meta: content.meta,
    topicTargetPlatforms: topic?.targetPlatforms
  })
}

export interface ContentListFilter {
  status?: string
  platform?: string
}

function filterContentsByPlatform(
  items: ReturnType<typeof contentDAO.list>,
  platform?: string
) {
  if (!platform) return items
  const topicMap = new Map(topicDAO.list().map(topic => [topic.id, topic]))
  return items.filter(item => {
    if (item.platform === platform) return true
    if (item.platform !== 'origin') return false
    if (!item.topicId) return false
    const topic = topicMap.get(item.topicId)
    if (!topic) return false
    return topic.targetPlatforms.includes(platform)
  })
}

export function registerContentHandlers(): void {
  ipcMain.handle('content:list', (_e, filter?: ContentListFilter | string) => {
    const resolved: ContentListFilter =
      typeof filter === 'string' ? { status: filter } : (filter ?? {})
    const items = contentDAO.list(resolved.status)
    return filterContentsByPlatform(items, resolved.platform)
  })

  ipcMain.handle('content:get', (_e, id: number) => contentDAO.getById(id))

  ipcMain.handle('content:create', (_e, input: ContentCreateInput) => contentDAO.create(input))

  ipcMain.handle('content:create-from-topic', (_e, topicId: number) => {
    const topic = topicDAO.getById(topicId)
    if (!topic) return { success: false, error: '选题不存在' }
    const existing = contentDAO.getOriginByTopicId(topicId)
    if (existing) {
      if (topic.status !== 'writing' && topic.status !== 'done') {
        topicDAO.update(topicId, { status: 'writing' })
      }
      return { success: true, content: existing, created: false }
    }
    const defaultStyle = writingStyleDAO.list().find(s => s.isDefault)
    let contentDomain = topic.domain
    if (!contentDomain && topic.targetPlatforms.length === 1) {
      const account = platformAccountDAO.getByPlatform(topic.targetPlatforms[0])
      contentDomain = account?.contentDomain ?? ''
    }
    const meta: Record<string, unknown> = {
      targetPlatforms: topic.targetPlatforms,
      contentDomain: contentDomain || undefined,
      sourcePlatform:
        topic.targetPlatforms.length === 1 ? topic.targetPlatforms[0] : undefined
    }
    if (defaultStyle) meta.writingStyleId = defaultStyle.id

    let content = contentDAO.create({
      title: topic.title,
      topicId,
      body: topic.description || topic.notes || ''
    })
    content = contentDAO.update(content.id, { meta }) ?? content
    topicDAO.update(topicId, { status: 'writing' })
    return { success: true, content, created: true }
  })

  ipcMain.handle('content:update', (_e, id: number, input: ContentUpdateInput, operation?: string) =>
    contentDAO.update(id, input, operation ?? 'manual_edit')
  )

  ipcMain.handle('content:delete', (_e, id: number) => contentDAO.delete(id))

  ipcMain.handle('content:list-versions', (_e, contentId: number) => {
    const c = contentDAO.getById(contentId)
    if (!c) return []
    const originId = contentDAO.getOriginId(c)
    return contentDAO.listVersions(originId)
  })

  ipcMain.handle(
    'content:platform-adapt',
    async (event, contentId: number, targetPlatform: string) =>
      runWithAiProgress(
        event.sender,
        '多平台改写',
        async progress => {
          const content = contentDAO.getById(contentId)
          if (!content) return { success: false, error: '内容不存在' }
          const originId = contentDAO.getOriginId(content)
          const origin = contentDAO.getById(originId) ?? content
          const result = await modelService.adaptToPlatform(
            origin.title,
            origin.body,
            targetPlatform,
            streamCallbacks(progress, { contentId, mode: 'adapt' })
          )
          if (!result.success || !result.content) return result

          const existing = contentDAO.listVersions(originId).find(v => v.platform === targetPlatform)
          if (existing && existing.id !== originId) {
            contentDAO.update(existing.id, {
              body: result.content,
              title: `${origin.title}（${targetPlatform}）`
            })
            return { ...result, versionId: existing.id }
          }
          const created = contentDAO.create({
            title: `${origin.title} · ${targetPlatform}`,
            body: result.content,
            topicId: origin.topicId,
            platform: targetPlatform,
            parentId: originId,
            contentType: 'article'
          })
          return { ...result, versionId: created.id }
        },
        r => ({ success: r.success, error: r.error })
      )
  )

  ipcMain.handle('content:ai-generate', async (event, contentId: number) =>
    runWithAiProgress(
      event.sender,
      'AI 生成',
      async progress => {
        const content = contentDAO.getById(contentId)
        if (!content) return { success: false, error: '内容不存在' }
        let brief = ''
        if (content.topicId) {
          const topic = topicDAO.getById(content.topicId)
          if (topic) {
            brief = [topic.description, topic.notes].filter(Boolean).join('\n')
          }
        }
        const writingStyleId =
          typeof content.meta?.writingStyleId === 'number' ? content.meta.writingStyleId : null
        const platformIds = platformIdsForContent(content)
        const result = await modelService.generateWriting(
          content.title,
          brief,
          streamCallbacks(progress, { contentId, mode: 'generate' }),
          writingStyleId,
          platformIds
        )
        return {
          success: result.success,
          content: result.content,
          error: result.error
        }
      },
      r => ({
        success: Boolean(r?.success),
        error: r?.error
      })
    )
  )

  ipcMain.handle(
    'content:ai-rewrite',
    async (event, contentId: number, selectedText: string, instruction: string) =>
      runWithAiProgress(
        event.sender,
        'AI 改写',
        async progress => {
          const content = contentDAO.getById(contentId)
          if (!content) return { success: false, error: '内容不存在' }
          const writingStyleId =
            typeof content.meta?.writingStyleId === 'number' ? content.meta.writingStyleId : null
          const platformIds = platformIdsForContent(content)
          return modelService.rewriteSelection(
            content.title,
            selectedText,
            instruction,
            streamCallbacks(progress, { contentId, mode: 'rewrite' }),
            writingStyleId,
            platformIds
          ).then(result => ({
            success: result.success,
            content: result.content,
            error: result.error
          }))
        },
        r => ({
          success: Boolean(r?.success),
          error: r?.error
        })
      )
  )
}
