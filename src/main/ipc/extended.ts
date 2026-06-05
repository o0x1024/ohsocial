import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { versionDAO } from '../db/dao/version-dao'
import { scheduleTemplateDAO, type TemplatePattern } from '../db/dao/schedule-template-dao'
import { platformAccountDAO } from '../db/dao/platform-account-dao'
import { slugifyPlatformName } from '../../shared/platform-slug'
import { customSkillDAO } from '../db/dao/custom-skill-dao'
import { metricsDAO } from '../db/dao/metrics-dao'
import { appPreferenceDAO } from '../db/dao/app-preference-dao'
import { contentDAO, scheduleDAO, topicDAO } from '../db'
import { modelService } from '../ai/model-service'
import { runWithAiProgress } from './ai-progress-runner'
import { refreshHotspots } from '../services/hotspot-fetch'
import { getDashboardStats } from '../services/stats'
import { exportContentMarkdown, exportAllMarkdown } from '../services/export'
import { diffLines, stripHtml } from '../../shared/text-diff'
import { hotspotDAO } from '../db/dao/hotspot-dao'
import { materialDAO } from '../db/dao/material-dao'

function parseJsonArray<T>(text: string): T[] {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return []
  try {
    return JSON.parse(m[0]) as T[]
  } catch {
    return []
  }
}

function parseJsonObject<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

export function registerExtendedHandlers(): void {
  ipcMain.handle('version:list', (_e, contentId: number) => versionDAO.list(contentId))

  ipcMain.handle('version:diff', (_e, versionIdA: number, versionIdB: number) => {
    const a = versionDAO.getById(versionIdA)
    const b = versionDAO.getById(versionIdB)
    if (!a || !b) return []
    return diffLines(stripHtml(a.body), stripHtml(b.body))
  })

  ipcMain.handle('version:restore', (_e, versionId: number) => {
    const v = versionDAO.getById(versionId)
    if (!v) return { success: false, error: '版本不存在' }
    const updated = contentDAO.update(v.contentId, { title: v.title, body: v.body }, 'restore')
    return { success: !!updated, content: updated }
  })

  ipcMain.handle('template:list', () => scheduleTemplateDAO.list())
  ipcMain.handle('template:create', (_e, name: string, pattern: TemplatePattern, description?: string) =>
    scheduleTemplateDAO.create(name, pattern, description ?? '')
  )
  ipcMain.handle('template:delete', (_e, id: number) => scheduleTemplateDAO.delete(id))

  ipcMain.handle('template:apply', (_e, templateId: number, weekStartIso: string) => {
    const template = scheduleTemplateDAO.list().find(t => t.id === templateId)
    if (!template) return { success: false, error: '模板不存在' }
    const start = new Date(weekStartIso)
    const created = []
    for (const slot of template.pattern.slots) {
      const d = new Date(start)
      d.setDate(start.getDate() + (slot.day - 1))
      const [h, m] = slot.time.split(':').map(Number)
      d.setHours(h || 9, m || 0, 0, 0)
      const pad = (n: number) => String(n).padStart(2, '0')
      const scheduledAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
      created.push(
        scheduleDAO.create({
          platform: slot.platform,
          scheduledAt,
          notes: slot.contentType ? `类型：${slot.contentType}` : ''
        })
      )
    }
    return { success: true, schedules: created }
  })

  ipcMain.handle('hotspot:list', () => hotspotDAO.list(50))
  ipcMain.handle('hotspot:refresh', (_e, source?: 'weibo' | 'baidu' | 'all') => refreshHotspots(source ?? 'all'))
  ipcMain.handle('hotspot:create', (_e, title: string, notes?: string) =>
    hotspotDAO.create(title, 'manual', { notes: notes ?? '' })
  )

  ipcMain.handle('stats:dashboard', () => getDashboardStats())

  ipcMain.handle('export:content', (_e, contentId: number) => exportContentMarkdown(contentId))
  ipcMain.handle('export:all', () => exportAllMarkdown())

  ipcMain.handle('account:list', () => platformAccountDAO.list())
  ipcMain.handle('account:upsert', (_e, platform: string, data: Record<string, unknown>) =>
    platformAccountDAO.upsert(platform, {
      displayName: data.displayName as string | undefined,
      accountName: data.accountName as string | undefined,
      accountId: data.accountId as string | undefined,
      followers: data.followers as number | undefined,
      notes: data.notes as string | undefined,
      contentDomain: data.contentDomain as string | undefined,
      contentKeywords: data.contentKeywords as string[] | undefined,
      contentBrief: data.contentBrief as string | undefined
    })
  )
  ipcMain.handle('account:create', (_e, displayName: string, platformId?: string) => {
    const name = displayName.trim()
    if (!name) return { success: false, error: '请输入平台名称' }
    const platform = (platformId?.trim() || slugifyPlatformName(name))
    if (platformAccountDAO.getByPlatform(platform)) {
      return { success: false, error: '该平台已存在' }
    }
    const account = platformAccountDAO.create(platform, { displayName: name })
    return { success: true, account }
  })
  ipcMain.handle('account:delete', (_e, platform: string) => {
    const ok = platformAccountDAO.delete(platform)
    return { success: ok, error: ok ? undefined : '平台不存在' }
  })

  ipcMain.handle('skill:list', () => customSkillDAO.list())
  ipcMain.handle('skill:upsert', (_e, skillId: string, name: string, content: string, description?: string) =>
    customSkillDAO.upsert(skillId, name, content, description ?? '')
  )
  ipcMain.handle('skill:delete', (_e, skillId: string) => customSkillDAO.delete(skillId))

  ipcMain.handle('skill:export', () => {
    const skills = customSkillDAO.list()
    const { filePath, canceled } = dialog.showSaveDialog({
      defaultPath: 'ohsocial-skills.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { success: false }
    fs.writeFileSync(filePath, JSON.stringify(skills, null, 2), 'utf-8')
    return { success: true, path: filePath }
  })

  ipcMain.handle('skill:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return { success: false }
    const raw = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8')) as Array<{
      skillId: string
      name: string
      content: string
      description?: string
    }>
    for (const s of raw) {
      customSkillDAO.upsert(s.skillId, s.name, s.content, s.description ?? '')
    }
    return { success: true, count: raw.length }
  })

  ipcMain.handle('metrics:list', (_e, contentId?: number) => metricsDAO.list(contentId))
  ipcMain.handle('metrics:create', (_e, input: Record<string, unknown>) =>
    metricsDAO.create(input as Parameters<typeof metricsDAO.create>[0])
  )

  ipcMain.handle('preference:get', (_e, key: string) => appPreferenceDAO.get(key))
  ipcMain.handle('preference:set', (_e, key: string, value: string) => {
    appPreferenceDAO.set(key, value)
    return true
  })

  ipcMain.handle('topic:recommend', async (event, platformId?: string) =>
    runWithAiProgress(event.sender, 'AI 推荐选题', async progress => {
    const result = await modelService.recommendTopics(5, { progress, signal: progress?.signal }, platformId)
    if (!result.success) return result
    const items = parseJsonArray<{
      title: string
      description?: string
      domain?: string
      targetPlatforms?: string[]
    }>(result.content)
    const account = platformId ? platformAccountDAO.getByPlatform(platformId) : undefined
    const created = []
    for (const item of items) {
      if (!item.title) continue
      const targetPlatforms = platformId
        ? [platformId]
        : (item.targetPlatforms ?? []).filter(Boolean)
      created.push(
        topicDAO.create({
          title: item.title,
          description: item.description ?? '',
          domain: item.domain ?? account?.contentDomain ?? '',
          targetPlatforms,
          source: 'ai_recommend',
          status: 'idea'
        })
      )
    }
    return { success: true, topics: created, raw: result.content }
  }, r => ({ success: r.success, error: r.error }))
  )

  ipcMain.handle('topic:score', async (event, id: number) =>
    runWithAiProgress(event.sender, 'AI 选题评分', async progress => {
    const topic = topicDAO.getById(id)
    if (!topic) return { success: false, error: '选题不存在' }
    const result = await modelService.scoreTopic(topic.title, topic.description, {
      progress,
      signal: progress?.signal
    }, topic.targetPlatforms)
    if (!result.success) return result
    const parsed = parseJsonObject<{ score: number; reason: string }>(result.content)
    if (parsed) {
      topicDAO.update(id, { aiScore: parsed.score, aiScoreReason: parsed.reason })
    }
    return { success: true, score: parsed?.score, reason: parsed?.reason, raw: result.content }
  }, r => ({ success: r.success, error: r.error }))
  )

  ipcMain.handle('schedule:suggest', async event =>
    runWithAiProgress(event.sender, 'AI 排期建议', async progress => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + 1)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const pad = (n: number) => String(n).padStart(2, '0')
    const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} 00:00:00`
    const to = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} 23:59:59`
    const week = scheduleDAO.list(from, to)
    const summary = week.map(s => `${s.scheduledAt} ${s.platform} ${s.contentTitle ?? ''}`).join('\n')
    return modelService.suggestSchedule(summary, { progress, signal: progress?.signal })
  }, r => ({ success: r.success, error: r.error }))
  )

  ipcMain.handle('material:pick-image', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (canceled || !filePaths[0]) return { success: false }
    const filePath = filePaths[0]
    const title = path.basename(filePath)
    const material = materialDAO.create({
      type: 'image',
      title,
      content: filePath,
      description: ''
    })
    return { success: true, material }
  })

  ipcMain.handle('material:ai-tags', async (event, id: number) =>
    runWithAiProgress(event.sender, 'AI 素材打标', async progress => {
    const m = materialDAO.getById(id)
    if (!m) return { success: false, error: '素材不存在' }
    const result = await modelService.tagMaterial(m.title, m.content || m.description, {
      progress,
      signal: progress?.signal
    })
    if (!result.success) return result
    const parsed = parseJsonObject<{ tags: string[] }>(result.content)
    const tags = parsed?.tags ?? result.content.split(/[、,，\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6)
    const updated = materialDAO.update(id, { tags })
    return { success: true, material: updated, tags }
  }, r => ({ success: r.success, error: r.error }))
  )

  ipcMain.handle('content:generate-titles', async (event, contentId: number) =>
    runWithAiProgress(event.sender, 'AI 生成标题', async progress => {
    const c = contentDAO.getById(contentId)
    if (!c) return { success: false, error: '内容不存在' }
    return modelService.generateTitles(stripHtml(c.body), { progress, signal: progress?.signal })
  }, r => ({ success: r.success, error: r.error }))
  )
}
