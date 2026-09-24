import { describe, expect, it } from 'vitest'
import { PluginService } from '../plugin.service'
import type { NodePressPlugin } from '@/plugins/types'

class FakeStore {
  ids: string[] = []
  writes: string[] = []
  failWrites = false

  async getActivePluginIds() {
    return [...this.ids]
  }

  async setActivePluginIds(ids: string[]) {
    if (this.failWrites) throw new Error('persist failed')
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
  events: string[] = []

  async activate(plugin: NodePressPlugin) {
    this.calls.push(plugin.id)
    this.events.push('runtime')
    return () => {
      this.cleanupCalls.push(plugin.id)
      this.events.push('runtime-cleanup')
    }
  }

  deactivate(pluginId: string) {
    this.cleanupCalls.push(pluginId)
    this.events.push('runtime-cleanup')
  }
}

const makePlugin = (
  id = 'animals',
  lifecycle: Pick<NodePressPlugin, 'onActivate' | 'onDeactivate' | 'onUninstall'> = {},
): NodePressPlugin => ({
  id,
  name: 'Animals',
  version: '1.0.0',
  ...lifecycle,
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

  it('runs activation and deactivation lifecycle in order', async () => {
    const store = new FakeStore()
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const plugin = makePlugin('animals', {
      onActivate: async () => { runtime.events.push('activate') },
      onDeactivate: async () => { runtime.events.push('deactivate') },
    })
    const service = new PluginService({ plugins: [plugin], store, runner, runtime })

    await service.activate('animals')
    await service.deactivate('animals')

    expect(runtime.events).toEqual(['runtime', 'activate', 'deactivate', 'runtime-cleanup'])
    expect(store.ids).toEqual([])
  })

  it('does not persist or leave runtime when onActivate fails', async () => {
    const store = new FakeStore()
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const plugin = makePlugin('animals', {
      onActivate: async () => { throw new Error('activate failed') },
    })
    const service = new PluginService({ plugins: [plugin], store, runner, runtime })

    await expect(service.activate('animals')).rejects.toThrow('activate failed')

    expect(runtime.cleanupCalls).toEqual(['animals'])
    expect(store.ids).toEqual([])
  })

  it('compensates onActivate when persisting activation fails', async () => {
    const store = new FakeStore()
    store.failWrites = true
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const plugin = makePlugin('animals', {
      onActivate: async () => { runtime.events.push('activate') },
      onDeactivate: async () => { runtime.events.push('compensate') },
    })
    const service = new PluginService({ plugins: [plugin], store, runner, runtime })

    await expect(service.activate('animals')).rejects.toThrow('persist failed')

    expect(runtime.events).toEqual(['runtime', 'activate', 'runtime-cleanup', 'compensate'])
    expect(runtime.cleanupCalls).toEqual(['animals'])
  })

  it('keeps the plugin active when onDeactivate fails', async () => {
    const store = new FakeStore()
    store.ids = ['animals']
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const plugin = makePlugin('animals', {
      onDeactivate: async () => { throw new Error('deactivate failed') },
    })
    const service = new PluginService({ plugins: [plugin], store, runner, runtime })

    await expect(service.deactivate('animals')).rejects.toThrow('deactivate failed')

    expect(store.ids).toEqual(['animals'])
    expect(runtime.cleanupCalls).toEqual([])
  })

  it('runs onActivate when loading a persisted plugin', async () => {
    const store = new FakeStore()
    store.ids = ['animals']
    const runner = new FakeRunner()
    const runtime = new FakeRuntime()
    const plugin = makePlugin('animals', {
      onActivate: async () => { runtime.events.push('activate') },
    })
    const service = new PluginService({ plugins: [plugin], store, runner, runtime })

    await service.loadActive()

    expect(runtime.events).toEqual(['runtime', 'activate'])
  })
})
