import type { Config } from '@measured/puck'
import { HookService } from '@/services/hook.service'
import { registeredPlugins } from '@/plugins/registry'
import { mergePuckComponents } from './components'
import { puckConfig } from './config'

type PluginListResponse = {
  plugins?: Array<{ id: string; active: boolean }>
}

export async function getClientPuckConfig(): Promise<Config<any>> {
  const response = await fetch('/api/admin/plugins')
  if (!response.ok) {
    throw new Error(`Failed to load active plugins: ${response.status}`)
  }

  const payload = await response.json() as PluginListResponse
  const activePluginIds = new Set(
    (payload.plugins ?? [])
      .filter((plugin) => plugin.active)
      .map((plugin) => plugin.id),
  )
  const components = mergePuckComponents(puckConfig.components, registeredPlugins, activePluginIds)
  const filteredComponents = await HookService.applyFilters(
    'puck_registered_components',
    components,
  )

  return {
    ...puckConfig,
    components: filteredComponents,
  }
}
