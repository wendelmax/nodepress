import { HookService } from '@/services/hook.service'
import type { NodePressPlugin, PluginContext, PluginMenuInput } from './types'
import type { PluginRuntime } from '@/services/plugin.service'

export class NodePressPluginRuntime implements PluginRuntime {
  private readonly cleanups = new Map<string, () => void>()

  async activate(plugin: NodePressPlugin): Promise<() => void> {
    this.deactivate(plugin.id)
    const cleanupCallbacks: Array<() => void> = []
    const track = (cleanup: () => void) => {
      cleanupCallbacks.push(cleanup)
      return cleanup
    }
    const menus = {
      addAdmin: (_item: PluginMenuInput) => track(() => {}),
      addPublic: (_item: PluginMenuInput) => track(() => {}),
    }
    const context: PluginContext = {
      pluginId: plugin.id,
      hooks: {
        addAction: (tag, callback, priority) => track(HookService.addAction(tag, callback, priority)),
        addFilter: (tag, callback, priority) => track(HookService.addFilter(tag, callback, priority)),
      },
      menus,
    }

    await plugin.register(context)
    const cleanup = () => {
      for (const callback of cleanupCallbacks.splice(0)) callback()
      this.cleanups.delete(plugin.id)
    }
    this.cleanups.set(plugin.id, cleanup)
    return cleanup
  }

  deactivate(pluginId: string): void {
    this.cleanups.get(pluginId)?.()
  }
}
