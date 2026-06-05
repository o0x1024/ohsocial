import { ipcMain } from 'electron'
import type { ScheduleCreateInput, ScheduleUpdateInput } from '../../shared/types/schedule'
import { scheduleDAO } from '../db'

export function registerScheduleHandlers(): void {
  ipcMain.handle('schedule:list', (_e, from?: string, to?: string) => scheduleDAO.list(from, to))

  ipcMain.handle('schedule:create', (_e, input: ScheduleCreateInput) => scheduleDAO.create(input))

  ipcMain.handle('schedule:update', (_e, id: number, input: ScheduleUpdateInput) =>
    scheduleDAO.update(id, input)
  )

  ipcMain.handle('schedule:delete', (_e, id: number) => scheduleDAO.delete(id))

  ipcMain.handle('schedule:mark-overdue', () => {
    scheduleDAO.markOverdue()
    return scheduleDAO.list()
  })
}
