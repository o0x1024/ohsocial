import { ipcMain } from 'electron'
import { topicDAO } from '../db'
import type { TopicCreateInput, TopicUpdateInput } from '../../shared/types/topic'

export function registerTopicHandlers(): void {
  ipcMain.handle('topic:list', (_event, status?: string) => {
    return topicDAO.list(status)
  })

  ipcMain.handle('topic:get', (_event, id: number) => {
    return topicDAO.getById(id)
  })

  ipcMain.handle('topic:create', (_event, input: TopicCreateInput) => {
    return topicDAO.create(input)
  })

  ipcMain.handle('topic:update', (_event, id: number, input: TopicUpdateInput) => {
    return topicDAO.update(id, input)
  })

  ipcMain.handle('topic:delete', (_event, id: number) => {
    return topicDAO.delete(id)
  })

  ipcMain.handle('topic:stats', () => {
    return topicDAO.countByStatus()
  })
}
