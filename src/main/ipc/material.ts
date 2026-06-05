import { ipcMain } from 'electron'
import type { MaterialCreateInput, MaterialUpdateInput } from '../../shared/types/material'
import { materialDAO } from '../db/dao/material-dao'

export function registerMaterialHandlers(): void {
  ipcMain.handle('material:list', (_e, type?: string) => materialDAO.list(type))
  ipcMain.handle('material:create', (_e, input: MaterialCreateInput) => materialDAO.create(input))
  ipcMain.handle('material:update', (_e, id: number, input: MaterialUpdateInput) =>
    materialDAO.update(id, input)
  )
  ipcMain.handle('material:delete', (_e, id: number) => materialDAO.delete(id))
  ipcMain.handle('material:search', (_e, q: string) => materialDAO.search(q))
}
