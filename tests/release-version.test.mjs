import assert from 'node:assert/strict'
import { bumpVersion, resolveReleaseType } from '../scripts/release/version.mjs'

assert.equal(resolveReleaseType('major/plugin-api'), 'major')
assert.equal(resolveReleaseType('breaking/database-contract'), 'major')
assert.equal(resolveReleaseType('feat/plugin-runtime'), 'minor')
assert.equal(resolveReleaseType('feature/theme-manager'), 'minor')
assert.equal(resolveReleaseType('fix/release-script'), 'patch')
assert.equal(resolveReleaseType('docs/release-process'), 'patch')
assert.equal(resolveReleaseType('unclassified-branch'), 'patch')

assert.equal(bumpVersion('0.1.0', 'major'), '1.0.0')
assert.equal(bumpVersion('1.4.9', 'minor'), '1.5.0')
assert.equal(bumpVersion('2.0.9', 'patch'), '2.0.10')
assert.throws(() => bumpVersion('1.0', 'patch'), /Unsupported semantic version/)
assert.throws(() => bumpVersion('1.0.0', 'unknown'), /Unsupported release type/)
