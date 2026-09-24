import type { NodePressPlugin } from '@/plugins/types'
import type { PuckComponents } from './types'

export type PuckComponentSource = Pick<NodePressPlugin, 'id' | 'puck'>

export function mergePuckComponents(
  base: PuckComponents,
  plugins: PuckComponentSource[],
  activePluginIds: ReadonlySet<string>,
): PuckComponents {
  const components = { ...base }

  for (const plugin of plugins) {
    if (!activePluginIds.has(plugin.id)) continue
    Object.assign(components, plugin.puck?.components ?? {})
  }

  return components
}
