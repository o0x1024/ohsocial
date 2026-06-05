import { ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import path from 'path'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

export function registerMediaHandlers(): void {
  ipcMain.handle('media:file-to-data-url', async (_e, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: '无效路径' }
    }
    try {
      const buf = await readFile(filePath)
      const ext = path.extname(filePath).slice(1).toLowerCase() || 'png'
      const mime = MIME[ext] ?? 'application/octet-stream'
      return {
        success: true,
        dataUrl: `data:${mime};base64,${buf.toString('base64')}`
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '读取失败' }
    }
  })
}
