import { ipcMain } from 'electron'

export function registerAppHandlers(): void {
  ipcMain.handle('app:getInfo', () => ({
    name: 'OhSocial',
    version: '0.1.0'
  }))
}
