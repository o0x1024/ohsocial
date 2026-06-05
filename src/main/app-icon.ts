import { app, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

let cachedIconPath: string | undefined

export function resolveAppIconPath(): string | undefined {
  if (cachedIconPath && existsSync(cachedIconPath)) return cachedIconPath

  const candidates = [
    join(process.cwd(), 'build/icon.png'),
    join(app.getAppPath(), 'build/icon.png'),
    join(__dirname, '../../build/icon.png')
  ]

  cachedIconPath = candidates.find(p => existsSync(p))
  return cachedIconPath
}

export function applyAppIcon(): void {
  const iconPath = resolveAppIconPath()
  if (!iconPath) return

  const image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) return

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(image)
  }
}

export function windowIcon(): Electron.NativeImage | string | undefined {
  const iconPath = resolveAppIconPath()
  if (!iconPath) return undefined
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? iconPath : image
}
