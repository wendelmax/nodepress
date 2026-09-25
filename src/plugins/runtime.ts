import { HookService } from '@/services/hook.service'
import { MenuService } from '@/services/menu.service'
import { contentTypeRegistry } from '@/modules/content/content-type-registry'
import { eventRegistry } from '@/core/events/registry'
import { commandRegistry, jobRegistry, routeRegistry } from './runtime-registries'
import type { NodePressPlugin, PluginContext, PluginMenuInput, PluginMenuItem } from './types'
import type { PluginRuntime } from '@/services/plugin.service'
import { createPluginCapabilities } from './capabilities'

export class NodePressPluginRuntime implements PluginRuntime {
  private readonly cleanups = new Map<string, () => void>()

  async activate(plugin: NodePressPlugin): Promise<() => void> {
    this.deactivate(plugin.id)
    const cleanupCallbacks: Array<() => void> = []
    const track = (cleanup: () => void) => {
      cleanupCallbacks.push(cleanup)
      return cleanup
    }
    const withSurface = (item: PluginMenuInput, surface: 'admin' | 'public'): PluginMenuItem => ({
      ...item,
      surface,
      children: item.children?.map((child) => withSurface(child, surface)),
    })
    const capabilities = createPluginCapabilities(plugin.id, plugin.permissions)
    const validateMenuCapabilities = (item: PluginMenuInput): void => {
      if (item.capability) capabilities.require(item.capability)
      item.children?.forEach(validateMenuCapabilities)
    }
    const menus = {
      addAdmin: (item: PluginMenuInput) => {
        validateMenuCapabilities(item)
        return track(MenuService.registerPluginMenu(plugin.id, withSurface(item, 'admin')))
      },
      addPublic: (item: PluginMenuInput) => {
        validateMenuCapabilities(item)
        return track(MenuService.registerPluginMenu(plugin.id, withSurface(item, 'public')))
      },
    }
    const context: PluginContext = {
      pluginId: plugin.id,
      capabilities,
      hooks: {
        addAction: (tag, callback, priority) => track(HookService.addAction(tag, callback, priority)),
        addFilter: (tag, callback, priority) => track(HookService.addFilter(tag, callback, priority)),
      },
      menus,
      contentTypes: {
        register: (definition) => track(contentTypeRegistry.register(definition)),
      },
      events: {
        on: (name, handler) => track(eventRegistry.on(name, handler)),
      },
      jobs: {
        add: (definition) => track(jobRegistry.add(definition)),
      },
      routes: {
        add: (definition) => track(routeRegistry.add(definition)),
      },
      commands: {
        add: (definition) => track(commandRegistry.add(definition)),
      },
    }

    const cleanup = () => {
      for (const callback of cleanupCallbacks.splice(0).reverse()) callback()
      this.cleanups.delete(plugin.id)
    }

    try {
      await plugin.register(context)
    } catch (error) {
      cleanup()
      throw error
    }

    this.cleanups.set(plugin.id, cleanup)
    return cleanup
  }

  deactivate(pluginId: string): void {
    this.cleanups.get(pluginId)?.()
  }
}
