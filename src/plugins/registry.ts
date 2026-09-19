import type { NodePressPlugin } from './types'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = []

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
