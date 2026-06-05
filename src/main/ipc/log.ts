import { ipcMain, shell } from 'electron'
import fs from 'fs'
import {
  appLogger,
  getAppLogPath,
  getLlmLogPath,
  getLogDir,
  readRecentLogLines,
  appLogFileName,
  llmLogFileName
} from '../services/file-logger'

/** 应用日志与 LLM 日志 IPC */
export function registerLogHandlers(): void {
  ipcMain.handle(
    'log:write',
    (_e, level: string, category: string, message: string, extra?: Record<string, unknown>) => {
      appLogger.write(level, category, message, extra)
      return true
    }
  )

  ipcMain.handle('log:getInfo', () => {
    return {
      logDir: getLogDir(),
      appTodayFile: getAppLogPath(),
      llmTodayFile: getLlmLogPath(),
      todayFile: getAppLogPath(),
      appRecentLines: readRecentLogLines(appLogFileName()),
      llmRecentLines: readRecentLogLines(llmLogFileName())
    }
  })

  ipcMain.handle('log:openDir', async () => {
    try {
      fs.mkdirSync(getLogDir(), { recursive: true })
      const err = await shell.openPath(getLogDir())
      if (err) return { success: false, error: err }
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '无法打开日志目录'
      }
    }
  })

  ipcMain.handle('log:openToday', async (_e, type: 'app' | 'llm' = 'app') => {
    try {
      const filePath = type === 'llm' ? getLlmLogPath() : getAppLogPath()
      fs.mkdirSync(getLogDir(), { recursive: true })
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf-8')
      }
      const err = await shell.openPath(filePath)
      if (err) return { success: false, error: err }
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '无法打开日志文件'
      }
    }
  })
}
