import { getRegisteredPlugins } from '@/plugins/registry'
import { PluginMigrationRunner } from '@/plugins/migration-runner'
import { NodePressPluginRuntime } from '@/plugins/runtime'
import { OptionService } from './option.service'
import { PluginService } from './plugin.service'

const globalForPlugins = globalThis as typeof globalThis & {
  __nodePressPluginService?: PluginService
  __nodePressActiveLoad?: Promise<void>
}

export async function getPluginService(): Promise<PluginService> {
  if (!globalForPlugins.__nodePressPluginService) {
    globalForPlugins.__nodePressPluginService = new PluginService({
      plugins: await getRegisteredPlugins(),
      store: OptionService,
      runner: new PluginMigrationRunner(),
      runtime: new NodePressPluginRuntime(),
    })
  }
  return globalForPlugins.__nodePressPluginService
}

export async function ensureActivePluginsLoaded(): Promise<void> {
  if (!globalForPlugins.__nodePressActiveLoad) {
    globalForPlugins.__nodePressActiveLoad = getPluginService()
      .then((service) => service.loadActive())
      .catch((error) => {
        globalForPlugins.__nodePressActiveLoad = undefined
        throw error
      })
  }
  await globalForPlugins.__nodePressActiveLoad
}
