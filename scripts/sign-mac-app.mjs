import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function findPaths(root, args) {
  if (!existsSync(root)) return []
  try {
    return execSync(`find "${root}" ${args}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

const apps = findPaths('release', '-name "OhSocial.app" -type d')
if (!apps.length) {
  console.error('OhSocial.app not found under release/')
  process.exit(1)
}

const appPath = apps[0]
console.log(`Signing ${appPath}`)

run(`xattr -cr "${appPath}"`)

const signTargets = [
  ...findPaths(join(appPath, 'Contents/Resources'), '-name "*.node"'),
  ...findPaths(join(appPath, 'Contents/Frameworks'), '-name "*.framework" -type d'),
  ...findPaths(join(appPath, 'Contents/Frameworks'), '-name "OhSocial Helper*.app" -type d'),
  ...findPaths(join(appPath, 'Contents/MacOS'), '-type f')
]

for (const target of signTargets) {
  run(`codesign --force --sign - "${target}"`)
}

run(`codesign --force --deep --sign - "${appPath}"`)
run(`codesign --verify --deep --strict --verbose=2 "${appPath}"`)

const outDir = dirname(appPath)

for (const dmg of findPaths('release', '-maxdepth 1 -name "*.dmg"')) {
  const signedDmg = join(outDir, '_signed.dmg')
  run(`rm -f "${dmg}" "${signedDmg}"`)
  run(`hdiutil create -volname "OhSocial" -srcfolder "${appPath}" -ov -format UDZO "${signedDmg}"`)
  run(`mv "${signedDmg}" "${dmg}"`)
  run(`codesign --force --sign - "${dmg}"`)
}

for (const zip of findPaths('release', '-maxdepth 1 -name "*-mac.zip"')) {
  run(`rm -f "${zip}"`)
  run(`ditto -c -k --sequesterRsrc --keepParent "${appPath}" "${zip}"`)
}

console.log('macOS ad-hoc signing complete')
