import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNodePressContext } from '@/core/context'
import { commandRegistry, jobRegistry, routeRegistry } from '../runtime-registries'
import {
  dispatchPluginRoute,
  executePluginCommand,
  runPluginJob,
} from '../runtime-consumers'

describe('plugin runtime consumers', () => {
  beforeEach(() => {
    commandRegistry.clear()
    jobRegistry.clear()
    routeRegistry.clear()
  })

  it('rejects route conflicts by method and normalized path', () => {
    const handler = vi.fn()
    routeRegistry.add({ id: 'first', method: 'GET', path: '/health', handler })

    expect(() => routeRegistry.add({
      id: 'second', method: 'GET', path: '/health/', handler,
    })).toThrow('Route already registered: GET /health')
    expect(() => routeRegistry.add({
      id: 'post-health', method: 'POST', path: '/health', handler,
    })).not.toThrow()
  })

  it('dispatches a matching plugin route under the runtime prefix', async () => {
    const context = createNodePressContext({ tenantId: 'tenant-1' })
    const handler = vi.fn(async (_request: Request, receivedContext) => {
      expect(receivedContext).toBe(context)
      return Response.json({ ok: true })
    })
    routeRegistry.add({ id: 'health', method: 'GET', path: '/health', handler })

    const response = await dispatchPluginRoute(
      new Request('https://nodepress.test/api/plugins/health'),
      context,
    )

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toEqual({ ok: true })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('returns undefined when no plugin route matches', async () => {
    const response = await dispatchPluginRoute(
      new Request('https://nodepress.test/api/plugins/missing'),
      createNodePressContext(),
    )

    expect(response).toBeUndefined()
  })

  it('executes registered jobs and commands by id', async () => {
    const context = createNodePressContext({ requestId: 'request-1' })
    const job = vi.fn()
    const command = vi.fn()
    jobRegistry.add({ id: 'animals.sync', handler: job })
    commandRegistry.add({ id: 'animals.reindex', handler: command })

    await runPluginJob('animals.sync', { full: true }, context)
    await executePluginCommand('animals.reindex', { dryRun: false }, context)

    expect(job).toHaveBeenCalledWith({ full: true }, context)
    expect(command).toHaveBeenCalledWith({ dryRun: false }, context)
  })

  it('reports unknown jobs and commands clearly', async () => {
    const context = createNodePressContext()

    await expect(runPluginJob('missing.job', {}, context))
      .rejects.toThrow('Unknown plugin job: missing.job')
    await expect(executePluginCommand('missing.command', {}, context))
      .rejects.toThrow('Unknown plugin command: missing.command')
  })
})
