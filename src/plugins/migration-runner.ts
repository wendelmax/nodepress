import type { Prisma } from '@prisma/client'
import type { NodePressPlugin, PluginMigration } from './types'
import { validatePluginManifest } from './validation'
import { checksumMigration } from './checksum'

export { checksumMigration }

export interface AppliedPluginMigration {
  pluginId: string
  migrationId: string
  checksum: string
  pluginVersion: string
  appliedAt?: Date
}

export interface PluginMigrationTransaction {
  pluginMigration: {
    create(args: { data: AppliedPluginMigration }): Promise<unknown>
  }
}

export interface PluginMigrationDatabase {
  pluginMigration: {
    findMany(args: { where: { pluginId: string } }): Promise<AppliedPluginMigration[]>
  }
  $transaction<T>(callback: (tx: PluginMigrationTransaction) => Promise<T>): Promise<T>
}

export class PluginMigrationRunner {
  constructor(private readonly database?: PluginMigrationDatabase) {}

  async getApplied(pluginId: string): Promise<AppliedPluginMigration[]> {
    const database = await this.getDatabase()
    return database.pluginMigration.findMany({ where: { pluginId } })
  }

  async runPending(plugin: NodePressPlugin): Promise<void> {
    validatePluginManifest(plugin)
    const migrations = plugin.migrations ?? []
    const applied = await this.getApplied(plugin.id)
    const appliedById = new Map(applied.map((row) => [row.migrationId, row]))

    for (const migration of migrations) {
      const row = appliedById.get(migration.id)
      if (row && row.checksum !== checksumMigration(migration)) {
        throw new Error(`Migration checksum mismatch: ${plugin.id}/${migration.id}`)
      }
    }

    const pending = migrations.filter((migration) => !appliedById.has(migration.id))
    if (pending.length === 0) return

    const database = await this.getDatabase()
    await database.$transaction(async (tx) => {
      for (const migration of pending) {
        await migration.up(tx as unknown as Prisma.TransactionClient)
        await tx.pluginMigration.create({
          data: {
            pluginId: plugin.id,
            migrationId: migration.id,
            checksum: checksumMigration(migration),
            pluginVersion: plugin.version,
          },
        })
      }
    })
  }

  private async getDatabase(): Promise<PluginMigrationDatabase> {
    if (this.database) return this.database
    const prismaModule = await import('@/lib/prisma')
    return prismaModule.default as unknown as PluginMigrationDatabase
  }
}
