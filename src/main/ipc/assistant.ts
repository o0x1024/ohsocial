import { ipcMain } from 'electron'
import { assistantDAO } from '../db/dao/assistant-dao'
import { assistantService, listAllSkills } from '../ai/assistant-service'
import { runWithAiProgress } from './ai-progress-runner'

export function registerAssistantHandlers(): void {
  ipcMain.handle('assistant:skills', () => listAllSkills())

  ipcMain.handle('assistant:conversations', () => assistantDAO.listConversations())

  ipcMain.handle('assistant:create', (_e, skillId?: string) =>
    assistantDAO.createConversation(skillId)
  )

  ipcMain.handle('assistant:messages', (_e, conversationId: number) =>
    assistantDAO.listMessages(conversationId)
  )

  ipcMain.handle(
    'assistant:chat',
    async (event, conversationId: number, text: string, skillId?: string) =>
      runWithAiProgress(
        event.sender,
        'AI 助手',
        async progress =>
          assistantService.sendMessage(
            conversationId,
            text,
            skillId,
            delta => progress?.delta(delta, 'content', { conversationId, mode: 'assistant' }),
            progress
          ),
        r => ({ success: r.success, error: r.error })
      )
  )

  ipcMain.handle('assistant:delete', (_e, id: number) => assistantDAO.deleteConversation(id))
}
