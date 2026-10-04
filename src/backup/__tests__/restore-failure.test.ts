import { describe, expect, it } from 'vitest'
import { BackupExporter, type BackupDataProvider } from '@/backup/exporter'
import { BackupService, type BackupRestoreDatabase, type BackupRestoreTransaction } from '@/backup/service'

const provider: BackupDataProvider = {
  async exportSections() { return { posts: [{ id: 1, postTitle: 'Post', guid: '/uploads/old.jpg' }] } },
  async exportMedia() { return [{ id: 10, filename: 'hero.jpg', mimeType: 'image/jpeg', sourceUrl: '/uploads/old.jpg', content: Buffer.from('image') }] },
  async exportExtensions() { return { plugins: [] } },
}

class FakeDatabase implements BackupRestoreDatabase {
  transactionCalls = 0
  committed = false
  constructor(private readonly fail = false) {}

  async existingIds() { return new Set<string | number>() }

  async transaction<T>(callback: (transaction: BackupRestoreTransaction) => Promise<T>): Promise<T> {
    this.transactionCalls += 1
    const pending: unknown[] = []
    const transaction: BackupRestoreTransaction = {
      insert: async (_section, row) => {
        pending.push(row)
        if (this.fail) throw new Error('database failed')
        return true
      },
    }
    const result = await callback(transaction)
    this.committed = true
    return result
  }
}

class FakeMediaStorage {
  uploaded: string[] = []
  deleted: string[] = []
  constructor(private readonly failOn?: string) {}
  async upload(_content: Buffer, filename: string) {
    if (filename === this.failOn) throw new Error('storage failed')
    const url = `/uploads/restored-${filename}`
    this.uploaded.push(url)
    return url
  }
  async delete(url: string) { this.deleted.push(url) }
}

async function createPackage() {
  return new BackupExporter(provider, '0.4.6').export({ sections: ['posts'], includeMedia: true, createdAt: '2026-10-04T00:00:00.000Z' })
}

describe('backup restore safety', () => {
  it('requires explicit confirmation and does not start a transaction', async () => {
    const database = new FakeDatabase()
    const media = new FakeMediaStorage()
    const service = new BackupService({ currentVersion: '0.4.7', provider, database, mediaStorage: media })

    await expect(service.restore(await createPackage(), { confirm: false })).rejects.toThrow(/confirmation/i)
    expect(database.transactionCalls).toBe(0)
    expect(media.uploaded).toHaveLength(0)
  })

  it('runs dry-run validation without writing media or database rows', async () => {
    const database = new FakeDatabase()
    const media = new FakeMediaStorage()
    const service = new BackupService({ currentVersion: '0.4.7', provider, database, mediaStorage: media })

    const result = await service.dryRun(await createPackage())

    expect(result.dryRun).toBe(true)
    expect(database.transactionCalls).toBe(0)
    expect(media.uploaded).toHaveLength(0)
  })

  it('cleans uploaded media and leaves the transaction uncommitted when the database fails', async () => {
    const database = new FakeDatabase(true)
    const media = new FakeMediaStorage()
    const service = new BackupService({ currentVersion: '0.4.7', provider, database, mediaStorage: media })

    await expect(service.restore(await createPackage(), { confirm: true })).rejects.toThrow(/database failed/i)
    expect(database.transactionCalls).toBe(1)
    expect(database.committed).toBe(false)
    expect(media.uploaded).toHaveLength(1)
    expect(media.deleted).toEqual(media.uploaded)
  })

  it('cleans earlier uploads when a later media upload fails', async () => {
    const twoMediaProvider: BackupDataProvider = {
      ...provider,
      async exportMedia() {
        return [
          { id: 10, filename: 'hero.jpg', mimeType: 'image/jpeg', sourceUrl: '/uploads/hero.jpg', content: Buffer.from('image') },
          { id: 11, filename: 'logo.jpg', mimeType: 'image/jpeg', sourceUrl: '/uploads/logo.jpg', content: Buffer.from('logo') },
        ]
      },
    }
    const database = new FakeDatabase()
    const media = new FakeMediaStorage('logo.jpg')
    const service = new BackupService({ currentVersion: '0.4.7', provider: twoMediaProvider, database, mediaStorage: media })

    await expect(service.restore(await new BackupExporter(twoMediaProvider, '0.4.6').export({ sections: ['posts'], includeMedia: true }), { confirm: true })).rejects.toThrow(/storage failed/i)
    expect(media.deleted).toEqual(media.uploaded)
    expect(database.transactionCalls).toBe(0)
  })

  it('does not delete committed media when a progress observer fails', async () => {
    const database = new FakeDatabase()
    const media = new FakeMediaStorage()
    const service = new BackupService({
      currentVersion: '0.4.7',
      provider,
      database,
      mediaStorage: media,
      onProgress: async () => { throw new Error('observer failed') },
    })

    const result = await service.restore(await createPackage(), { confirm: true })

    expect(result.dryRun).toBe(false)
    expect(database.committed).toBe(true)
    expect(media.deleted).toHaveLength(0)
  })

  it('reports export progress and audit events', async () => {
    const progress: string[] = []
    const audit: string[] = []
    const service = new BackupService({
      currentVersion: '0.4.7',
      provider,
      database: new FakeDatabase(),
      onProgress: (event) => { progress.push(event.stage) },
      audit: (event) => { audit.push(event.action) },
    })

    await service.export({ sections: ['posts'], includeMedia: false })

    expect(progress).toEqual(['export', 'complete'])
    expect(audit).toEqual(['backup.export.started', 'backup.export.completed'])
  })
})
