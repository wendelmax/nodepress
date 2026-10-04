import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import lgpdConsentPlugin from './lgpd-consent'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [animalsPlugin, lgpdConsentPlugin]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
