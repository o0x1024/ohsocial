import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { initSchema } from './db'
import { registerIpcHandlers } from './ipc'
import { startScheduleReminderLoop } from './backup/data-backup'
import { applyAppIcon, windowIcon } from './app-icon'
import { appLogger } from './services/file-logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'OhSocial',
    icon: windowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  applyAppIcon()
  appLogger.info('app', 'OhSocial 启动', {
    version: app.getVersion(),
    cwd: process.cwd(),
    platform: process.platform
  })
  initSchema()
  registerIpcHandlers()
  startScheduleReminderLoop()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
