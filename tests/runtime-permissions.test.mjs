import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dockerfile = readFileSync(resolve('Dockerfile'), 'utf8')
const configDirectory = '/var/lib/nodepress'

assert.ok(dockerfile.includes(`NODEPRESS_CONFIG_DIR=${configDirectory}`))
assert.ok(!dockerfile.includes(`NODE_OPTIONS=--env-file=${configDirectory}/.env`))
assert.ok(dockerfile.includes(`RUN mkdir -p ${configDirectory}`))
const ownershipInstruction = `RUN mkdir -p ${configDirectory} && touch ${configDirectory}/.env && chown -R nextjs:nodejs ${configDirectory}`
assert.ok(dockerfile.includes(ownershipInstruction))
assert.ok(dockerfile.indexOf(ownershipInstruction) < dockerfile.indexOf('USER nextjs'))
assert.ok(dockerfile.includes('COPY --from=builder --chown=nextjs:nodejs /app/scripts/runtime-config.mjs ./scripts/runtime-config.mjs'))
assert.ok(dockerfile.includes('COPY --from=builder --chown=nextjs:nodejs /app/scripts/serve.mjs ./scripts/serve.mjs'))
assert.ok(dockerfile.includes('CMD ["node", "scripts/serve.mjs", "server.js"]'))

console.log('runtime permissions tests passed')
