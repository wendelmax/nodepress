import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import legacyBridgePlugin from './legacy-bridge/manifest'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [animalsPlugin, legacyBridgePlugin]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
