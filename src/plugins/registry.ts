import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import landingPagesPlugin from './landing-pages'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [animalsPlugin, landingPagesPlugin]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
