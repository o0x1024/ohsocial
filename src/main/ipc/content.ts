import { ipcMain } from 'electron'
import type { ContentCreateInput, ContentUpdateInput } from '../../shared/types/content'
import { contentDAO, topicDAO } from '../db'
import { modelService } from '../ai/model-service'
import { runWithAiProgress } from './ai-progress-runner'

function streamCallbacks(
  progress: import('../ai/ai-progress').AiProgressEmitter | undefined,
  legacy: Record<string, unknown>
) {
  return { progress, deltaLegacy: legacy, signal: progress?.signal }
}

export function registerContentHandlers(): void {
  ipcMain.handle('content:list', (_e, status?: string) => contentDAO.list(status))

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
    const content = contentDAO.create({
      title: topic.title,
      topicId,
      body: topic.description || topic.notes || ''
    })
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
        return modelService.generateWriting(
          content.title,
          brief,
          streamCallbacks(progress, { contentId, mode: 'generate' })
        )
      },
      r => ({ success: r.success, error: r.error })
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
          return modelService.rewriteSelection(
            content.title,
            selectedText,
            instruction,
            streamCallbacks(progress, { contentId, mode: 'rewrite' })
          )
        },
        r => ({ success: r.success, error: r.error })
      )
  )
}
