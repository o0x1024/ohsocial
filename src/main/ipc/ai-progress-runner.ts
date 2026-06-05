import { ipcMain, BrowserWindow, type WebContents } from 'electron'
import { createAiProgress, type AiProgressEmitter } from '../ai/ai-progress'
import { selectModelConfig } from '../ai/model-resolve'
import axios from 'axios'

const activeTasks = new Map<string, AiProgressEmitter>()

let cancelHandlerRegistered = false

export function registerAiProgressHandlers(): void {
  if (cancelHandlerRegistered) return
  cancelHandlerRegistered = true
  ipcMain.handle('ai:cancel', (_e, taskId: string) => {
    activeTasks.get(taskId)?.cancel()
    return true
  })
}

function isCancelledError(err: unknown): boolean {
  if (axios.isCancel(err)) return true
  if (err instanceof Error) {
    return err.name === 'AbortError' || err.name === 'CanceledError'
  }
  return false
}

function resolveProgressSender(sender: WebContents): WebContents | undefined {
  if (sender && !sender.isDestroyed()) return sender
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) return win.webContents
  return undefined
}

export async function runWithAiProgress<T>(
  sender: WebContents,
  label: string,
  fn: (progress: AiProgressEmitter | undefined) => Promise<T>,
  endState?: (result: T) => { success: boolean; error?: string }
): Promise<T> {
  const progress = createAiProgress(resolveProgressSender(sender), label)
  if (progress) {
    activeTasks.set(progress.taskId, progress)
    const model = selectModelConfig()
    progress.start(model?.modelName)
  }
  try {
    const result = await fn(progress)
    const state = endState?.(result) ?? { success: true }
    progress?.end(state.success, state.error)
    return result
  } catch (err: unknown) {
    const cancelled = isCancelledError(err)
    const msg = cancelled
      ? '已取消'
      : err instanceof Error
        ? err.message
        : 'AI 调用失败'
    progress?.end(false, msg)
    if (cancelled) return undefined as T
    throw new Error(msg)
  } finally {
    if (progress) activeTasks.delete(progress.taskId)
  }
}
