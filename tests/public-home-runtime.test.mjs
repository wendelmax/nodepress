import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const homePage = readFileSync(resolve('src/app/(web)/page.tsx'), 'utf8')

assert.match(homePage, /export const dynamic\s*=\s*['"]force-dynamic['"]/, 'public home must read installation state at runtime')
assert.doesNotMatch(homePage, /export const dynamic\s*=\s*['"]force-static['"]/, 'public home must not be statically pre-rendered')

console.log('public home runtime tests passed')
