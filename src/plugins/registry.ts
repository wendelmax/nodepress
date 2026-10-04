import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import landingPagesPlugin from './landing-pages'
import seoOptimizerPlugin from './seo-optimizer'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [animalsPlugin, landingPagesPlugin, seoOptimizerPlugin]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
