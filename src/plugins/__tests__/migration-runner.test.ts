import { describe, expect, it } from 'vitest'
import { checksumMigration, PluginMigrationRunner } from '../migration-runner'
import type { NodePressPlugin, PluginMigration } from '../types'

type Row = {
  pluginId: string
  migrationId: string
  checksum: string
  pluginVersion: string
}

class FakeMigrationDatabase {
  rows: Row[] = []
  calls: string[] = []
  pluginMigration = {
    findMany: async ({ where }: { where: { pluginId: string } }) =>
      this.rows.filter((row) => row.pluginId === where.pluginId),
    create: async ({ data }: { data: Row }) => {
      this.rows.push(data)
      return data
    },
  }

  async $transaction<T>(callback: (tx: FakeMigrationDatabase) => Promise<T>): Promise<T> {
    const snapshot = [...this.rows]
    try {
      return await callback(this)
    } catch (error) {
      this.rows = snapshot
      throw error
    }
  }
}

const plugin = (migrations: PluginMigration[]): NodePressPlugin => ({
  id: 'animals',
  name: 'Animals',
  version: '1.0.0',
  migrations,
  register() {},
})

describe('PluginMigrationRunner', () => {
  it('runs pending migrations in declaration order', async () => {
    const db = new FakeMigrationDatabase()
    const migrations: PluginMigration[] = [
      { id: '001-first', async up() { db.calls.push('first') } },
      { id: '002-second', async up() { db.calls.push('second') } },
    ]

    await new PluginMigrationRunner(db).runPending(plugin(migrations))

    expect(db.calls).toEqual(['first', 'second'])
    expect(db.rows.map((row) => row.migrationId)).toEqual(['001-first', '002-second'])
  })

  it('skips an already applied migration with the same checksum', async () => {
    const db = new FakeMigrationDatabase()
    const migration: PluginMigration = { id: '001-first', async up() { db.calls.push('called') } }
    db.rows.push({
      pluginId: 'animals',
      migrationId: migration.id,
      checksum: checksumMigration(migration),
      pluginVersion: '1.0.0',
    })

    await new PluginMigrationRunner(db).runPending(plugin([migration]))

    expect(db.calls).toEqual([])
  })

  it('rejects a changed checksum for an applied migration', async () => {
    const db = new FakeMigrationDatabase()
    const original: PluginMigration = { id: '001-first', async up() {} }
    const changed: PluginMigration = { id: '001-first', async up() { const changedValue = 'changed'; void changedValue } }
    db.rows.push({
      pluginId: 'animals',
      migrationId: original.id,
      checksum: checksumMigration(original),
      pluginVersion: '1.0.0',
    })

    await expect(new PluginMigrationRunner(db).runPending(plugin([changed]))).rejects.toThrow(/checksum/i)
  })

  it('rolls back ledger rows when a migration fails', async () => {
    const db = new FakeMigrationDatabase()
    const migrations: PluginMigration[] = [
      { id: '001-first', async up() {} },
      { id: '002-fails', async up() { throw new Error('boom') } },
    ]

    await expect(new PluginMigrationRunner(db).runPending(plugin(migrations))).rejects.toThrow('boom')
    expect(db.rows).toEqual([])
  })
})
