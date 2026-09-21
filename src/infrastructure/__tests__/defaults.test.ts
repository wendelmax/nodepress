import { describe, expect, it } from 'vitest'
import { createNodePressContext } from '@/core/context'
import { createDefaultInfrastructure } from '../defaults'

describe('default infrastructure', () => {
  const testEnv = { NODE_ENV: 'test' as const }

  it('uses in-memory storage by default', () => {
    const infrastructure = createDefaultInfrastructure({ env: testEnv })
    expect(infrastructure.storage.id).toBe('storage.in-memory')
    expect(infrastructure.queue.id).toBe('queue.in-process')
  })

  it('selects local filesystem storage explicitly', () => {
    const infrastructure = createDefaultInfrastructure({ env: { ...testEnv, STORAGE_DRIVER: 'local-filesystem' } })
    expect(infrastructure.storage.id).toBe('storage.local-filesystem')
  })

  it('reports unconfigured optional services as degraded', async () => {
    const context = createNodePressContext()
    const infrastructure = createDefaultInfrastructure({ env: testEnv })
    await expect(infrastructure.search.health(context)).resolves.toMatchObject({ status: 'degraded' })
    await expect(infrastructure.mail.health(context)).resolves.toMatchObject({ status: 'degraded' })
    await expect(infrastructure.webhooks.health(context)).resolves.toMatchObject({ status: 'degraded' })
  })
})
