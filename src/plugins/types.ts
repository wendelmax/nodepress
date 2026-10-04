import type { Prisma } from '@prisma/client'
import type { ContentTypeDefinition, ContentTypeRegistry } from '@/modules/content'
import type { NodePressEventHandler } from '@/core/events/registry'
import type { PluginCommandDefinition, PluginJobDefinition, PluginRouteDefinition } from './runtime-registries'
import type { PuckComponents } from '@/lib/puck/types'
import type { PluginCapabilities } from './capabilities'
import type { PluginStorage } from './storage'
import type { PluginSettings, PluginSecretDefinition, PluginSecrets, PluginSettingDefinition } from './config'
import type { PluginAdminPageRegistrar, PluginSlotRegistrar } from './slots'

export type PluginSurface = 'admin' | 'public'
export type PluginCapability = string
export type PluginLifecycleHook = () => void | Promise<void>

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

export type PluginHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface PluginHealth {
  status: PluginHealthStatus
  message?: string
  checkedAt?: string
}

export interface PluginContext {
  pluginId: string
  capabilities: PluginCapabilities
  storage: PluginStorage
  hooks: PluginHookRegistrar
  menus: PluginMenuRegistrar
  contentTypes: PluginContentTypeRegistrar
  events: PluginEventRegistrar
  jobs: PluginJobRegistrar
  routes: PluginRouteRegistrar
  commands: PluginCommandRegistrar
  settings: PluginSettings
  secrets: PluginSecrets
  slots: PluginSlotRegistrar
  adminPages: PluginAdminPageRegistrar
}

export interface NodePressPlugin {
  id: string
  name: string
  version: string
  puck?: {
    components?: PuckComponents
  }
  onActivate?: PluginLifecycleHook
  onDeactivate?: PluginLifecycleHook
  onUninstall?: PluginLifecycleHook
  engine?: { nodepress: string }
  dependencies?: Record<string, string>
  permissions?: PluginCapability[]
  settings?: readonly PluginSettingDefinition[]
  secrets?: readonly PluginSecretDefinition[]
  health?: () => PluginHealth | Promise<PluginHealth>
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
