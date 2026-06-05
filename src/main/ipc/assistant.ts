import { ipcMain } from 'electron'
import { assistantDAO } from '../db/dao/assistant-dao'
import { assistantService, listAllSkills } from '../ai/assistant-service'

export function registerAssistantHandlers(): void {
  ipcMain.handle('assistant:skills', () => listAllSkills())

  ipcMain.handle('assistant:conversations', () => assistantDAO.listConversations())

  ipcMain.handle('assistant:create', (_e, skillId?: string) =>
    assistantDAO.createConversation(skillId)
  )

  ipcMain.handle('assistant:messages', (_e, conversationId: number) =>
    assistantDAO.listMessages(conversationId)
  )

  ipcMain.handle('assistant:chat', async (_event, conversationId: number, text: string, skillId?: string) =>
    assistantService.sendMessage(conversationId, text, skillId)
  )

  ipcMain.handle('assistant:delete', (_e, id: number) => assistantDAO.deleteConversation(id))
}
