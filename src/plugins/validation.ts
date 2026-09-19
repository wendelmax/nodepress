import type { NodePressPlugin } from './types'

const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PERMISSION_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

export function validatePluginManifest(plugin: NodePressPlugin): void {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Invalid plugin manifest')
  }

  if (!IDENTIFIER_PATTERN.test(plugin.id)) {
    throw new Error(`Invalid plugin id: ${plugin.id}`)
  }

  if (!plugin.name?.trim()) {
    throw new Error(`Invalid plugin name for ${plugin.id}`)
  }

  if (!VERSION_PATTERN.test(plugin.version)) {
    throw new Error(`Invalid plugin version for ${plugin.id}: ${plugin.version}`)
  }

  if (typeof plugin.register !== 'function') {
    throw new Error(`Invalid plugin register function for ${plugin.id}`)
  }

  const migrationIds = new Set<string>()
  for (const migration of plugin.migrations ?? []) {
    if (!IDENTIFIER_PATTERN.test(migration.id)) {
      throw new Error(`Invalid migration id for ${plugin.id}: ${migration.id}`)
    }
    if (migrationIds.has(migration.id)) {
      throw new Error(`Duplicate migration id for ${plugin.id}: ${migration.id}`)
    }
    if (typeof migration.up !== 'function') {
      throw new Error(`Invalid migration handler for ${plugin.id}: ${migration.id}`)
    }
    migrationIds.add(migration.id)
  }

  const permissionIds = new Set<string>()
  for (const permission of plugin.permissions ?? []) {
    if (!PERMISSION_PATTERN.test(permission) || permissionIds.has(permission)) {
      throw new Error(`Invalid plugin permission for ${plugin.id}: ${permission}`)
    }
    permissionIds.add(permission)
  }
}

export function validateMenuInput(item: { id: string; label: string }): void {
  if (!IDENTIFIER_PATTERN.test(item.id)) {
    throw new Error(`Invalid menu id: ${item.id}`)
  }
  if (!item.label?.trim()) {
    throw new Error(`Invalid menu label for ${item.id}`)
  }
}
