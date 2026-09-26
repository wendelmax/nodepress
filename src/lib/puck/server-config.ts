import type { Config } from '@measured/puck'
import { HookService } from '@/services/hook.service'
import { getPluginService, ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { getRegisteredPlugins } from '@/plugins/registry'
import { mergePuckComponents } from './components'
import { puckConfig } from './config'
import type { BuilderContext } from './types'

export async function getServerPuckConfig(_context: BuilderContext = 'post'): Promise<Config<any>> {
  await ensureActivePluginsLoaded()

  const [service, plugins] = await Promise.all([
    getPluginService(),
    getRegisteredPlugins(),
  ])
  const statuses = await service.list()
  const activePluginIds = new Set(
    statuses.filter((status) => status.active).map((status) => status.id),
  )
  const components = mergePuckComponents(puckConfig.components, plugins, activePluginIds)
  const filteredComponents = await HookService.applyFilters(
    'puck_registered_components',
    components,
  )

  return {
    ...puckConfig,
    components: filteredComponents,
  }
}
