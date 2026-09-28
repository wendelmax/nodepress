import type { ReactNode } from 'react'
import { HookService } from '@/services/hook.service'
import type { PluginCapabilities } from './capabilities'
import type { PluginCapability, PluginSurface } from './types'

export interface PluginSlotDefinition {
  id: string
  surface: PluginSurface
  render: (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>
  capability?: PluginCapability
  position?: number
}

export interface PluginSlotRegistrar {
  register(definition: PluginSlotDefinition): () => void
}

export interface PluginAdminPageDefinition {
  slug: string
  label: string
  render: () => ReactNode | Promise<ReactNode>
  capability?: PluginCapability
  position?: number
}

export interface PluginAdminPageRegistrar {
  register(definition: PluginAdminPageDefinition): () => void
}

function slotTag(surface: PluginSurface, id: string): string {
  return `plugin_slot:${surface}:${id}`
}

function validateIdentifier(kind: string, id: string): void {
  if (!/^[a-z][a-z0-9._-]*$/.test(id)) throw new Error(`Invalid plugin ${kind} id: ${id}`)
}

export function createPluginSlotRegistrar(capabilities: PluginCapabilities): PluginSlotRegistrar {
  return {
    register(definition) {
      validateIdentifier('slot', definition.id)
      capabilities.require(definition.capability ?? 'slots.register')
      return HookService.addAction(
        slotTag(definition.surface, definition.id),
        (props: Record<string, unknown>) => definition.render(props),
        definition.position,
      )
    },
  }
}

export function createPluginAdminPageRegistrar(capabilities: PluginCapabilities): PluginAdminPageRegistrar {
  return {
    register(definition) {
      validateIdentifier('admin page', definition.slug)
      capabilities.require(definition.capability ?? 'admin.pages')
      return HookService.addAction(
        `admin_plugin_page_${definition.slug}`,
        () => definition.render(),
        definition.position,
      )
    },
  }
}

export async function renderPluginSlot(
  surface: PluginSurface,
  id: string,
  props: Record<string, unknown> = {},
): Promise<ReactNode[]> {
  return HookService.doAction(slotTag(surface, id), props) as Promise<ReactNode[]>
}
