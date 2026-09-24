import type { NodePressPlugin } from '@/plugins/types'
import type { PuckComponents } from './types'

export function mergePuckComponents(
  base: PuckComponents,
  plugins: NodePressPlugin[],
  activePluginIds: ReadonlySet<string>,
): PuckComponents {
  const components = { ...base }

  for (const plugin of plugins) {
    if (!activePluginIds.has(plugin.id)) continue
    Object.assign(components, plugin.puck?.components ?? {})
  }

  return components
}
