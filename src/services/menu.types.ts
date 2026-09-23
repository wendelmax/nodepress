import type { PluginSurface } from '@/plugins/types'

export interface MenuNode {
  id: string
  label: string
  surface: PluginSurface
  href?: string
  parentId?: string
  position: number
  capability?: string
  icon?: string
  pluginId: string
  children: MenuNode[]
}
