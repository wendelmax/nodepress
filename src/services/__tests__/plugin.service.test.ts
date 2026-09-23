import { describe, expect, it } from 'vitest'
import { PluginService } from '../plugin.service'
import type { NodePressPlugin } from '@/plugins/types'

class FakeStore {
  ids: string[] = []
  writes: string[] = []

  async getActivePluginIds() {
    return [...this.ids]
  }

  async setActivePluginIds(ids: string[]) {
    this.writes.push(ids.join(','))
    this.ids = [...ids]
  }
}

class FakeRunner {
  calls: string[] = []
  shouldFail = false

  async runPending(plugin: NodePressPlugin) {
    this.calls.push(plugin.id)
    if (this.shouldFail) throw new Error('migration failed')
  }
}

class FakeRuntime {
  calls: string[] = []
  cleanupCalls: string[] = []

  async activate(plugin: NodePressPlugin) {
    this.calls.push(plugin.id)
    return () => this.cleanupCalls.push(plugin.id)
  }

  deactivate(pluginId: string) {
    this.cleanupCalls.push(pluginId)
  }
}

const makePlugin = (id = 'animals'): NodePressPlugin => ({
  id,
  name: 'Animals',
  version: '1.0.0',
  register() {},
})

describe('PluginService', () => {
  it('runs migrations before runtime registration and persistence', async () => {
    const store = new FakeStore()
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const service = new PluginService({ plugins: [makePlugin()], store, runner, runtime })

    await service.activate('animals')

    expect(runner.calls).toEqual(['animals'])
    expect(runtime.calls).toEqual(['animals'])
    expect(store.ids).toEqual(['animals'])
  })

  it('does not persist activation when a migration fails', async () => {
    const store = new FakeStore()
    const runner = new FakeRunner()
    runner.shouldFail = true
    const runtime = new FakeRuntime()
    const service = new PluginService({ plugins: [makePlugin()], store, runner, runtime })

    await expect(service.activate('animals')).rejects.toThrow('migration failed')
    expect(runtime.calls).toEqual([])
    expect(store.writes).toEqual([])
  })

  it('deactivates runtime contributions without changing migration state', async () => {
    const store = new FakeStore()
    store.ids = ['animals']
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const service = new PluginService({ plugins: [makePlugin()], store, runner, runtime })

    await service.deactivate('animals')

    expect(runtime.cleanupCalls).toEqual(['animals'])
    expect(store.ids).toEqual([])
    expect(runner.calls).toEqual([])
  })

  it('rejects unknown plugins', async () => {
    const service = new PluginService({
      plugins: [makePlugin()],
      store: new FakeStore(),
      runner: new FakeRunner(),
      runtime: new FakeRuntime(),
    })

    await expect(service.activate('missing')).rejects.toThrow(/unknown plugin/i)
  })
})
