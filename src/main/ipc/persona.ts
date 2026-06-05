import { ipcMain } from 'electron'
import { personaDAO } from '../db'
import type { PersonaUpdateInput } from '../../shared/types/persona'

export function registerPersonaHandlers(): void {
  ipcMain.handle('persona:get', () => {
    return personaDAO.get()
  })

  ipcMain.handle('persona:update', (_event, input: PersonaUpdateInput) => {
    return personaDAO.update(input)
  })

  ipcMain.handle('persona:isConfigured', () => {
    return personaDAO.isConfigured()
  })
}
