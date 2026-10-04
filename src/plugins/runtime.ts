import { HookService } from '@/services/hook.service'
import { MenuService } from '@/services/menu.service'
import { contentTypeRegistry } from '@/modules/content/content-type-registry'
import { eventRegistry } from '@/core/events/registry'
import { commandRegistry, jobRegistry, routeRegistry } from './runtime-registries'
import type { NodePressPlugin, PluginContext, PluginMenuInput, PluginMenuItem } from './types'
import type { PluginRuntime } from '@/services/plugin.service'
import { createPluginCapabilities } from './capabilities'
import { createPluginStorage } from './storage'
import type { PluginStorage } from './storage'
import { createPluginSecrets, createPluginSettings } from './config'
import { createPluginAdminPageRegistrar, createPluginSlotRegistrar } from './slots'

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
    const rawStorage = createPluginStorage(plugin.id)
    const settings = createPluginSettings(plugin.id, plugin.settings ?? [], rawStorage)
    const secrets = createPluginSecrets(
      plugin.id,
      plugin.secrets ?? [],
      rawStorage,
      process.env.NODEPRESS_PLUGIN_SECRETS_KEY ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '',
    )
    const slots = createPluginSlotRegistrar(capabilities)
    const adminPages = createPluginAdminPageRegistrar(capabilities)
    const storage: PluginStorage = {
      get: async <T>(key: string) => {
        capabilities.require('storage.read')
        return rawStorage.get<T>(key)
      },
      set: async (key, value) => {
        capabilities.require('storage.write')
        return rawStorage.set(key, value)
      },
      delete: async (key) => {
        capabilities.require('storage.write')
        return rawStorage.delete(key)
      },
    }
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
      storage,
      settings: {
        get: async <T>(id: string) => {
          capabilities.require('settings.read')
          return settings.get<T>(id)
        },
        set: async <T>(id: string, value: T) => {
          capabilities.require('settings.write')
          return settings.set(id, value)
        },
        getAll: async (options) => {
          capabilities.require('settings.read')
          return settings.getAll(options)
        },
        definitions: () => {
          capabilities.require('settings.read')
          return settings.definitions()
        },
      },
      secrets: {
        get: async (id: string) => {
          capabilities.require('secrets.read')
          return secrets.get(id)
        },
        set: async (id: string, value: string) => {
          capabilities.require('secrets.write')
          return secrets.set(id, value)
        },
        delete: async (id: string) => {
          capabilities.require('secrets.write')
          return secrets.delete(id)
        },
        has: async (id: string) => {
          capabilities.require('secrets.read')
          return secrets.has(id)
        },
      },
      slots: {
        register: (definition) => track(slots.register(definition)),
      },
      adminPages: {
        register: (definition) => track(adminPages.register(definition)),
      },
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
