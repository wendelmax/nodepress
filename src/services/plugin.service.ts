import type { NodePressPlugin, PluginHealth } from '@/plugins/types'
import type { PluginMigrationRunner } from '@/plugins/migration-runner'
import { NODEPRESS_ENGINE_VERSION, resolvePluginOrder, satisfies } from '@/plugins/dependencies'

export interface PluginActivationStore {
  getActivePluginIds(): Promise<string[]>
  setActivePluginIds(ids: string[]): Promise<void>
}

export interface PluginRuntime {
  activate(plugin: NodePressPlugin): Promise<() => void>
  deactivate(pluginId: string): void
}

export interface PluginStatus {
  id: string
  name: string
  version: string
  active: boolean
}

export interface PluginDetailedStatus extends PluginStatus {
  engineCompatible: boolean
  health: PluginHealth
}

export interface PluginServiceOptions {
  plugins: NodePressPlugin[]
  store: PluginActivationStore
  runner: Pick<PluginMigrationRunner, 'runPending' | 'forget'>
  runtime: PluginRuntime
}

export class PluginService {
  private readonly pluginsById: Map<string, NodePressPlugin>
  private readonly operations = new Map<string, Promise<unknown>>()

  constructor(private readonly options: PluginServiceOptions) {
    const orderedPlugins = resolvePluginOrder(options.plugins)
    this.pluginsById = new Map(orderedPlugins.map((plugin) => [plugin.id, plugin]))
    if (this.pluginsById.size !== options.plugins.length) {
      throw new Error('Duplicate plugin id in registry')
    }
  }

  async list(): Promise<PluginStatus[]> {
    const activeIds = new Set(await this.options.store.getActivePluginIds())
    return [...this.pluginsById.values()].map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      active: activeIds.has(plugin.id),
    }))
  }

  async getStatus(pluginId: string): Promise<PluginDetailedStatus> {
    const plugin = this.requirePlugin(pluginId)
    const activeIds = new Set(await this.options.store.getActivePluginIds())
    return {
      ...this.status(plugin, activeIds.has(pluginId)),
      engineCompatible: !plugin.engine?.nodepress || satisfies(NODEPRESS_ENGINE_VERSION, plugin.engine.nodepress),
      health: await this.getHealth(pluginId),
    }
  }

  async getHealth(pluginId: string): Promise<PluginHealth> {
    const plugin = this.requirePlugin(pluginId)
    if (!plugin.health) return { status: 'healthy', checkedAt: new Date().toISOString() }
    try {
      const health = await plugin.health()
      return { ...health, checkedAt: health.checkedAt ?? new Date().toISOString() }
    } catch {
      return { status: 'unhealthy', message: 'Plugin health check failed', checkedAt: new Date().toISOString() }
    }
  }

  async activate(pluginId: string): Promise<PluginStatus> {
    return this.withPluginLock(pluginId, async () => {
      const plugin = this.requirePlugin(pluginId)
      const activeIds = await this.options.store.getActivePluginIds()
      if (activeIds.includes(pluginId)) return this.status(plugin, true)

      for (const dependencyId of Object.keys(plugin.dependencies ?? {})) {
        if (!activeIds.includes(dependencyId)) {
          throw new Error(`Plugin dependency not active: ${plugin.id} -> ${dependencyId}`)
        }
      }

      await this.options.runner.runPending(plugin)
      const cleanup = await this.options.runtime.activate(plugin)
      let lifecycleStarted = false
      try {
        lifecycleStarted = Boolean(plugin.onActivate)
        await plugin.onActivate?.()
        await this.options.store.setActivePluginIds([...activeIds, pluginId])
      } catch (error) {
        cleanup()
        if (lifecycleStarted) {
          try {
            await plugin.onDeactivate?.()
          } catch (compensationError) {
            console.error(`Plugin activation compensation failed: ${plugin.id}`, compensationError)
          }
        }
        throw error
      }

      return this.status(plugin, true)
    })
  }

  async deactivate(pluginId: string): Promise<PluginStatus> {
    return this.withPluginLock(pluginId, async () => {
      const plugin = this.requirePlugin(pluginId)
      const activeIds = await this.options.store.getActivePluginIds()
      if (!activeIds.includes(pluginId)) return this.status(plugin, false)

      await plugin.onDeactivate?.()
      this.options.runtime.deactivate(pluginId)
      try {
        await this.options.store.setActivePluginIds(activeIds.filter((id) => id !== pluginId))
      } catch (error) {
        let cleanup: (() => void) | undefined
        try {
          cleanup = await this.options.runtime.activate(plugin)
          await plugin.onActivate?.()
        } catch (compensationError) {
          cleanup?.()
          console.error(`Plugin deactivation compensation failed: ${plugin.id}`, compensationError)
        }
        throw error
      }
      return this.status(plugin, false)
    })
  }

  async uninstall(pluginId: string): Promise<PluginStatus> {
    return this.withPluginLock(pluginId, async () => {
      const plugin = this.requirePlugin(pluginId)
      const activeIds = await this.options.store.getActivePluginIds()
      if (activeIds.includes(pluginId)) {
        throw new Error(`Cannot uninstall active plugin: ${pluginId}`)
      }

      await plugin.onUninstall?.()
      await this.options.runner.forget(pluginId)
      return this.status(plugin, false)
    })
  }

  async loadActive(): Promise<void> {
    const activeIds = await this.options.store.getActivePluginIds()
    const ordered = resolvePluginOrder([...this.pluginsById.values()])
    for (const plugin of ordered.filter((candidate) => activeIds.includes(candidate.id))) {
      await this.options.runner.runPending(plugin)
      const cleanup = await this.options.runtime.activate(plugin)
      const lifecycleStarted = Boolean(plugin.onActivate)
      try {
        await plugin.onActivate?.()
      } catch (error) {
        cleanup()
        if (lifecycleStarted) {
          try {
            await plugin.onDeactivate?.()
          } catch (compensationError) {
            console.error(`Plugin boot compensation failed: ${plugin.id}`, compensationError)
          }
        }
        throw error
      }
    }
  }

  private requirePlugin(pluginId: string): NodePressPlugin {
    const plugin = this.pluginsById.get(pluginId)
    if (!plugin) throw new Error(`Unknown plugin: ${pluginId}`)
    return plugin
  }

  private status(plugin: NodePressPlugin, active: boolean): PluginStatus {
    return { id: plugin.id, name: plugin.name, version: plugin.version, active }
  }

  private async withPluginLock<T>(pluginId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.operations.get(pluginId) ?? Promise.resolve()
    const current = previous.then(operation, operation)
    this.operations.set(pluginId, current)
    try {
      return await current
    } finally {
      if (this.operations.get(pluginId) === current) this.operations.delete(pluginId)
    }
  }
}
