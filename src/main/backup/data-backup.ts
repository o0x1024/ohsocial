import { app, BrowserWindow, dialog, Notification } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDatabase, closeDatabase } from '../db/connection'
import { topicDAO, contentDAO, scheduleDAO, personaDAO } from '../db'

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'ohsocial.db')
}

export async function backupDatabase(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const src = getDbPath()
    if (!fs.existsSync(src)) {
      return { success: false, error: '数据库文件不存在' }
    }
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '备份数据',
      defaultPath: `ohsocial-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }]
    })
    if (canceled || !filePath) return { success: false, error: '已取消' }
    fs.copyFileSync(src, filePath)
    return { success: true, path: filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '备份失败' }
  }
}

export async function restoreDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '恢复数据',
      filters: [{ name: 'SQLite', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return { success: false, error: '已取消' }
    closeDatabase()
    fs.copyFileSync(filePaths[0], getDbPath())
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '恢复失败' }
  }
}

export async function exportJson(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      topics: topicDAO.list(),
      contents: contentDAO.list(),
      schedules: scheduleDAO.list(),
      persona: personaDAO.get()
    }
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '导出 JSON',
      defaultPath: `ohsocial-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { success: false, error: '已取消' }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '导出失败' }
  }
}

const notifiedKeys = new Set<string>()

function notifySchedule(
  item: ReturnType<typeof scheduleDAO.list>[number],
  kind: 'advance' | 'due'
): void {
  const key = `${item.id}:${kind}`
  if (notifiedKeys.has(key)) return
  notifiedKeys.add(key)

  const label = item.contentTitle || item.topicTitle || '待发布内容'
  const isDue = kind === 'due'
  const title = isDue ? 'OhSocial · 该发布了' : 'OhSocial · 发布预告'
  const body = isDue
    ? `「${label}」已到发布时间（${item.platform}），请前往平台发帖`
    : `「${label}」将在 ${item.reminderMinutes} 分钟后发布（${item.platform}）`

  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('schedule:reminder', {
      scheduleId: item.id,
      kind,
      label,
      platform: item.platform,
      scheduledAt: item.scheduledAt,
      contentId: item.contentId,
      reminderMinutes: item.reminderMinutes
    })
  }
}

export function startScheduleReminderLoop(): void {
  const tick = () => {
    scheduleDAO.markOverdue()
    for (const item of scheduleDAO.listAdvanceReminders()) {
      notifySchedule(item, 'advance')
    }
    for (const item of scheduleDAO.listDuePublishReminders()) {
      notifySchedule(item, 'due')
    }
  }
  tick()
  setInterval(tick, 30_000)
}
