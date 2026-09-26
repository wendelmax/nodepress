import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const layoutPath = resolve('src/app/(web)/setup-config/layout.tsx')
assert.equal(existsSync(layoutPath), true, 'setup-config must have a server layout')

const layout = readFileSync(layoutPath, 'utf8')
assert.match(layout, /checkInstallation\(true\)/, 'setup-config must check installation state before rendering')
assert.match(layout, /children/, 'setup-config layout must render its children when installation is incomplete')

console.log('setup config runtime tests passed')
