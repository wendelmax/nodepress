import type { NodePressPlugin } from './types'
import animalsPlugin from './animals'
import lgpdConsentPlugin from './lgpd-consent'
import landingPagesPlugin from './landing-pages'
import seoOptimizerPlugin from './seo-optimizer'
import './legacy'

export const registeredPlugins: NodePressPlugin[] = [
  animalsPlugin,
  lgpdConsentPlugin,
  landingPagesPlugin,
  seoOptimizerPlugin,
]

export async function getRegisteredPlugins(): Promise<NodePressPlugin[]> {
  return registeredPlugins
}
