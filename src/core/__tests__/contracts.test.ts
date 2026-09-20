import { describe, expect, it } from 'vitest'
import {
  createNodePressContext,
  deriveNodePressContext,
} from '../context'
import {
  resolveModuleOrder,
  validateModule,
  type NodePressModule,
} from '../contracts/module'
import { createDomainEvent } from '../events/types'
import { inspectPort, type NodePressPort } from '../ports'

describe('NodePress core contracts', () => {
  it('preserves request and tenant context when deriving a child operation', () => {
    const root = createNodePressContext({
      requestId: 'req-1',
      tenantId: 'site-1',
      actor: { id: 'user-1', role: 'admin' },
      locale: 'pt-BR',
      metadata: { source: 'test' },
    })

    const child = deriveNodePressContext(root, { metadata: { module: 'content' } })

    expect(child.requestId).toBe('req-1')
    expect(child.tenantId).toBe('site-1')
    expect(child.actor).toEqual({ id: 'user-1', role: 'admin' })
    expect(child.metadata).toEqual({ source: 'test', module: 'content' })
  })

  it('orders modules deterministically and rejects missing or cyclic dependencies', () => {
    const content = moduleOf('content')
    const media = moduleOf('media', ['content'])
    const admin = moduleOf('admin', ['media'])

    expect(resolveModuleOrder([admin, media, content]).map((item) => item.id)).toEqual([
      'content', 'media', 'admin',
    ])
    expect(() => resolveModuleOrder([moduleOf('admin', ['missing'])])).toThrow(/missing/i)
    expect(() => resolveModuleOrder([moduleOf('a', ['b']), moduleOf('b', ['a'])])).toThrow(/cycle/i)
  })

  it('validates module metadata and creates typed event envelopes', () => {
    const module = moduleOf('content')
    expect(() => validateModule(module)).not.toThrow()
    expect(() => validateModule({ ...module, id: 'Invalid ID' })).toThrow(/module id/i)

    const event = createDomainEvent('content.published', { contentId: 'post-1' }, {
      requestId: 'req-1',
      tenantId: 'site-1',
      metadata: {},
    })
    expect(event).toMatchObject({
      name: 'content.published',
      payload: { contentId: 'post-1' },
      context: { requestId: 'req-1', tenantId: 'site-1' },
    })
    expect(event.id).toEqual(expect.any(String))
    expect(event.occurredAt).toEqual(expect.any(Date))
  })

  it('reports adapter capabilities through a stable port health contract', async () => {
    const port: NodePressPort = {
      id: 'cache.memory',
      capabilities: ['get', 'set', 'delete'],
      async health() {
        return { status: 'healthy', details: { entries: 2 } }
      },
    }

    await expect(inspectPort(port, createNodePressContext({ requestId: 'req-1' }))).resolves.toEqual({
      id: 'cache.memory',
      capabilities: ['get', 'set', 'delete'],
      status: 'healthy',
      details: { entries: 2 },
    })
  })
})

function moduleOf(id: string, dependencies: string[] = []): NodePressModule {
  return {
    id,
    version: '1.0.0',
    dependencies,
    async start() {},
    async stop() {},
    async health() { return { status: 'healthy' } },
  }
}
