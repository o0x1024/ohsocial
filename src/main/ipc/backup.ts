import { ipcMain } from 'electron'
import { backupDatabase, restoreDatabase, exportJson, getDbPath } from '../backup/data-backup'
import { appPreferenceDAO } from '../db'

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:database', () => backupDatabase())
  ipcMain.handle('backup:saveDatabase', () => backupDatabase())
  ipcMain.handle('backup:restore', () => restoreDatabase())
  ipcMain.handle('backup:restoreDatabase', () => restoreDatabase())
  ipcMain.handle('backup:exportJson', () => exportJson())
  ipcMain.handle('backup:getDbPath', () => getDbPath())
  ipcMain.handle('backup:listAuto', () => [] as Array<{ name: string; path: string; size: number; mtime: string }>)
  ipcMain.handle('backup:auto', async () => {
    const r = await backupDatabase()
    return r.path ?? ''
  })

  ipcMain.handle('app:onboardingDone', () => appPreferenceDAO.isOnboardingDone())
  ipcMain.handle('app:setOnboardingDone', (_e, done: boolean) => {
    appPreferenceDAO.setOnboardingDone(done)
    return true
  })
}
