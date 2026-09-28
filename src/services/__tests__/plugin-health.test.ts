import { describe, expect, it } from 'vitest'
import { PluginService } from '../plugin.service'
import type { NodePressPlugin } from '@/plugins/types'

const dependencies = { async runPending() {}, async forget() {} }
const store = { async getActivePluginIds() { return [] as string[] }, async setActivePluginIds() {} }
const runtime = { async activate() { return () => {} }, deactivate() {} }

function service(plugin: NodePressPlugin) {
  return new PluginService({ plugins: [plugin], store, runner: dependencies, runtime })
}

describe('plugin health status', () => {
  it('returns health and engine compatibility without exposing configuration', async () => {
    const result = await service({
      id: 'reports', name: 'Reports', version: '1.0.0', engine: { nodepress: '>=1.0.0' },
      register() {}, health: () => ({ status: 'degraded', message: 'provider unavailable' }),
    }).getStatus('reports')

    expect(result.engineCompatible).toBe(true)
    expect(result.health.status).toBe('degraded')
    expect(result.health.message).toBe('provider unavailable')
  })

  it('converts health exceptions to a safe unhealthy status', async () => {
    const result = await service({
      id: 'reports', name: 'Reports', version: '1.0.0', register() {},
      health: () => { throw new Error('secret provider token') },
    }).getHealth('reports')

    expect(result).toMatchObject({ status: 'unhealthy', message: 'Plugin health check failed' })
    expect(JSON.stringify(result)).not.toContain('secret provider token')
  })
})
