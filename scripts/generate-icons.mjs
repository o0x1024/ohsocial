/**
 * 从 build/icon.svg 生成应用图标（PNG / ICNS / ICO）
 * 运行: node scripts/generate-icons.mjs
 */
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { execSync } from 'child_process'
import { rmSync, existsSync } from 'fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
const svgPath = join(buildDir, 'icon.svg')

const pngSizes = [16, 32, 64, 128, 256, 512, 1024]

async function renderPng(size) {
  const svg = await readFile(svgPath)
  return sharp(svg, { density: Math.max(144, Math.ceil((size / 1024) * 288)) })
    .resize(size, size)
    .png()
    .toBuffer()
}

async function writePngs() {
  await mkdir(buildDir, { recursive: true })
  for (const size of pngSizes) {
    const buf = await renderPng(size)
    await writeFile(join(buildDir, `icon-${size}.png`), buf)
  }
  const main = await renderPng(1024)
  await writeFile(join(buildDir, 'icon.png'), main)

  const publicDir = join(root, 'src/renderer/public')
  await mkdir(publicDir, { recursive: true })
  await writeFile(join(publicDir, 'icon.png'), await renderPng(256))
  console.log('PNG icons written to build/ and src/renderer/public/')
}

async function writeIcns() {
  if (process.platform !== 'darwin') {
    console.log('Skip ICNS (not on macOS)')
    return
  }
  const iconset = join(buildDir, 'icon.iconset')
  if (existsSync(iconset)) rmSync(iconset, { recursive: true })
  await mkdir(iconset, { recursive: true })

  const mapping = [
    ['icon-16.png', 'icon_16x16.png'],
    ['icon-32.png', 'icon_16x16@2x.png'],
    ['icon-32.png', 'icon_32x32.png'],
    ['icon-64.png', 'icon_32x32@2x.png'],
    ['icon-128.png', 'icon_128x128.png'],
    ['icon-256.png', 'icon_128x128@2x.png'],
    ['icon-256.png', 'icon_256x256.png'],
    ['icon-512.png', 'icon_256x256@2x.png'],
    ['icon-512.png', 'icon_512x512.png'],
    ['icon-1024.png', 'icon_512x512@2x.png']
  ]

  for (const [src, dest] of mapping) {
    const data = await readFile(join(buildDir, src))
    await writeFile(join(iconset, dest), data)
  }

  execSync(`iconutil -c icns "${iconset}" -o "${join(buildDir, 'icon.icns')}"`, { stdio: 'inherit' })
  rmSync(iconset, { recursive: true })
  console.log('icon.icns created')
}

await writePngs()
await writeIcns()
