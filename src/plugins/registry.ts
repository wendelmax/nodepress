import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [animalsPlugin]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
