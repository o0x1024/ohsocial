import { ipcMain } from 'electron'
import { promptTemplateDAO } from '../db/dao/prompt-template-dao'
import type { PromptCategory } from '../db/dao/prompt-template-dao'

export function registerPromptHandlers(): void {
  ipcMain.handle('prompt:list', () => promptTemplateDAO.list())
  ipcMain.handle('prompt:listByCategory', (_e, cat: PromptCategory) =>
    promptTemplateDAO.listByCategory(cat))
  ipcMain.handle('prompt:resolve', (_e, key: string) => promptTemplateDAO.resolve(key))
  ipcMain.handle('prompt:setUserText', (_e, key: string, text: string | null) =>
    promptTemplateDAO.setUserText(key, text))
  ipcMain.handle('prompt:resetToDefault', (_e, key: string) => promptTemplateDAO.resetToDefault(key))
  ipcMain.handle('prompt:resetAll', () => {
    promptTemplateDAO.resetAll()
    return true
  })
}
