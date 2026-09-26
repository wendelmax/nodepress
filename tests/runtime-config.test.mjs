import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ensureRuntimeConfig } from '../scripts/runtime-config.mjs'

const directory = await mkdtemp(path.join(os.tmpdir(), 'nodepress-runtime-config-'))
const first = await ensureRuntimeConfig({ configDirectory: directory })
const content = await readFile(first.envPath, 'utf8')

assert.equal(first.createdSecret, true)
assert.match(content, /^NEXTAUTH_SECRET="[a-f0-9]{64}"$/m)

const second = await ensureRuntimeConfig({ configDirectory: directory })
assert.equal(second.createdSecret, false)
assert.equal(second.secret, first.secret)
