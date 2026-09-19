import type { Prisma } from '@prisma/client'

export type PluginSurface = 'admin' | 'public'
export type PluginCapability = string

export interface PluginMenuItem {
  id: string
  label: string
  surface: PluginSurface
  href?: string
  parentId?: string
  position?: number
  capability?: PluginCapability
  icon?: string
  children?: PluginMenuItem[]
  pluginId?: string
}

export type PluginMenuInput = Omit<PluginMenuItem, 'surface' | 'pluginId' | 'children'> & {
  children?: PluginMenuInput[]
}

export interface PluginMigration {
  id: string
  up(tx: Prisma.TransactionClient): Promise<void>
  down?(tx: Prisma.TransactionClient): Promise<void>
}

export interface PluginHookRegistrar {
  addAction(tag: string, callback: (...args: any[]) => any, priority?: number): () => void
  addFilter(tag: string, callback: (...args: any[]) => any, priority?: number): () => void
}

export interface PluginMenuRegistrar {
  addAdmin(item: PluginMenuInput): () => void
  addPublic(item: PluginMenuInput): () => void
}

export interface PluginContext {
  pluginId: string
  hooks: PluginHookRegistrar
  menus: PluginMenuRegistrar
}

export interface NodePressPlugin {
  id: string
  name: string
  version: string
  permissions?: PluginCapability[]
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
