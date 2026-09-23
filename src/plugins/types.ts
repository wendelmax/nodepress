import type { Prisma } from '@prisma/client'
import type { ContentTypeDefinition, ContentTypeRegistry } from '@/modules/content'
import type { NodePressEventHandler } from '@/core/events/registry'
import type { PluginCommandDefinition, PluginJobDefinition, PluginRouteDefinition } from './runtime-registries'

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

export interface PluginContentTypeRegistrar {
  register(definition: ContentTypeDefinition): () => void
}

export interface PluginEventRegistrar {
  on<TPayload>(name: string, handler: NodePressEventHandler<TPayload>): () => void
}

export interface PluginJobRegistrar {
  add(definition: PluginJobDefinition): () => void
}

export interface PluginRouteRegistrar {
  add(definition: PluginRouteDefinition): () => void
}

export interface PluginCommandRegistrar {
  add(definition: PluginCommandDefinition): () => void
}

export interface PluginContext {
  pluginId: string
  hooks: PluginHookRegistrar
  menus: PluginMenuRegistrar
  contentTypes: PluginContentTypeRegistrar
  events: PluginEventRegistrar
  jobs: PluginJobRegistrar
  routes: PluginRouteRegistrar
  commands: PluginCommandRegistrar
}

export interface NodePressPlugin {
  id: string
  name: string
  version: string
  engine?: { nodepress: string }
  dependencies?: Record<string, string>
  permissions?: PluginCapability[]
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
