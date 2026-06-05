import { execSync } from 'child_process'
import { globSync } from 'fs'
import { join, dirname } from 'path'

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

const apps = globSync('release/**/OhSocial.app')
if (!apps.length) {
  console.error('OhSocial.app not found under release/')
  process.exit(1)
}

const appPath = apps[0]
console.log(`Signing ${appPath}`)

run(`xattr -cr "${appPath}"`)

const signTargets = [
  ...globSync(join(appPath, 'Contents/Resources/**/*.node')),
  ...globSync(join(appPath, 'Contents/Frameworks/**/*.framework')),
  ...globSync(join(appPath, 'Contents/Frameworks/OhSocial Helper*.app')),
  ...globSync(join(appPath, 'Contents/MacOS/*'))
]

for (const target of signTargets) {
  run(`codesign --force --sign - "${target}"`)
}

run(`codesign --force --deep --sign - "${appPath}"`)
run(`codesign --verify --deep --strict --verbose=2 "${appPath}"`)

const outDir = dirname(appPath)

for (const dmg of globSync('release/*.dmg')) {
  const signedDmg = join(outDir, '_signed.dmg')
  run(`rm -f "${dmg}" "${signedDmg}"`)
  run(`hdiutil create -volname "OhSocial" -srcfolder "${appPath}" -ov -format UDZO "${signedDmg}"`)
  run(`mv "${signedDmg}" "${dmg}"`)
  run(`codesign --force --sign - "${dmg}"`)
}

for (const zip of globSync('release/*-mac.zip')) {
  run(`rm -f "${zip}"`)
  run(`ditto -c -k --sequesterRsrc --keepParent "${appPath}" "${zip}"`)
}

console.log('macOS ad-hoc signing complete')
