import { describe, expect, it } from 'vitest'
import { ReconciliationService, type ReconciliationSnapshot, type ReconciliationStore } from '../reconciliation'

describe('legacy bridge reconciliation', () => {
  it('marks missing, duplicate and checksum mismatch as blocking errors', async () => {
    const store = new MemoryReconciliationStore({
      expected: [
        { resource: 'animals', legacyId: 'legacy-1', checksum: 'sha256:a' },
        { resource: 'animals', legacyId: 'legacy-2', checksum: 'sha256:b' },
        { resource: 'animals', legacyId: 'legacy-3', checksum: 'sha256:c' },
        { resource: 'media', legacyId: 'legacy-4', checksum: 'sha256:d' },
      ],
      imported: [
        { resource: 'animals', legacyId: 'legacy-1', checksum: 'sha256:a' },
        { resource: 'animals', legacyId: 'legacy-3', checksum: 'sha256:c' },
        { resource: 'animals', legacyId: 'legacy-3', checksum: 'sha256:c' },
        { resource: 'media', legacyId: 'legacy-4', checksum: 'sha256:changed' },
      ],
    })
    const report = await new ReconciliationService(store).reconcile('run-1')

    expect(report.blockingErrors).toEqual(expect.arrayContaining([
      'missing:animals:legacy-2',
      'duplicate:animals:legacy-3',
      'checksum:media:legacy-4',
    ]))
    expect(report.status).toBe('failed')
  })

  it('passes when every source item has one matching imported mapping', async () => {
    const snapshot: ReconciliationSnapshot = {
      expected: [{ resource: 'pages', legacyId: 'page-1', checksum: 'sha256:a' }],
      imported: [{ resource: 'pages', legacyId: 'page-1', checksum: 'sha256:a' }],
    }

    await expect(new ReconciliationService(new MemoryReconciliationStore(snapshot)).reconcile('run-2'))
      .resolves.toMatchObject({ status: 'passed', blockingErrors: [], missing: [], duplicates: [], checksumMismatches: [] })
  })
})

class MemoryReconciliationStore implements ReconciliationStore {
  constructor(private readonly snapshot: ReconciliationSnapshot) {}

  async getSnapshot(_runId: string): Promise<ReconciliationSnapshot> {
    return this.snapshot
  }
}
