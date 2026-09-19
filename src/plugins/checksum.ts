import { createHash } from 'node:crypto'
import type { PluginMigration } from './types'

export function checksumMigration(migration: PluginMigration): string {
  const source = `${migration.id}:${migration.up.toString().replace(/\s+/g, ' ').trim()}`
  return createHash('sha256').update(source).digest('hex')
}
