import { describe, expect, it } from 'vitest'
import type { LegacyExportPage, LegacyExportRequest } from '../contracts'
import { BridgeRunner, type BridgeMapping, type BridgeMappingStore, type BridgeTargetWriter, type LegacyPageClient } from '../bridge-runner'

const page = (runId: string): LegacyExportPage => ({
  contractVersion: '1',
  resource: 'animals',
  runId,
  watermark: '2026-09-24T00:00:00.000Z',
  items: [
    { legacyId: 'animal-1', updatedAt: '2026-09-23T23:00:00.000Z', payload: { nome: 'Luna' } },
    { legacyId: 'animal-2', updatedAt: '2026-09-23T23:01:00.000Z', payload: { nome: 'Sol' } },
  ],
  pageChecksum: `sha256:${runId}`,
})

describe('legacy bridge runner', () => {
  it('upserts by resource and legacyId when the same page is replayed', async () => {
    const client = new StaticClient()
    const mappings = new MemoryMappings()
    const targets = new MemoryTargets()
    const runner = new BridgeRunner({ client, mappings, targets })

    const first = await runner.run({ resource: 'animals', runId: 'run-1', limit: 10 })
    const second = await runner.run({ resource: 'animals', runId: 'run-2', limit: 10 })

    expect(first).toMatchObject({ status: 'passed', imported: 2, created: 2, updated: 0, failed: 0 })
    expect(second).toMatchObject({ status: 'passed', imported: 2, created: 0, updated: 2, failed: 0 })
    expect(mappings.records).toHaveLength(2)
    expect(targets.records).toHaveLength(2)
  })

  it('reports retries from the client and continues after an item failure', async () => {
    const client = new StaticClient()
    client.lastRetryCount = 2
    const mappings = new MemoryMappings()
    const targets = new MemoryTargets()
    targets.failLegacyId = 'animal-2'
    const runner = new BridgeRunner({ client, mappings, targets })

    await expect(runner.run({ resource: 'animals', runId: 'run-3', limit: 10 })).resolves.toMatchObject({
      status: 'failed',
      imported: 1,
      created: 1,
      failed: 1,
      retried: 2,
    })
    expect(mappings.records.map((record) => record.legacyId)).toEqual(['animal-1'])
  })
})

class StaticClient implements LegacyPageClient {
  lastRetryCount = 0

  async fetchPage(request: LegacyExportRequest): Promise<LegacyExportPage> {
    return page(request.runId)
  }
}

class MemoryMappings implements BridgeMappingStore {
  records: BridgeMapping[] = []

  async find(resource: string, legacyId: string): Promise<BridgeMapping | undefined> {
    return this.records.find((record) => record.resource === resource && record.legacyId === legacyId)
  }

  async save(record: BridgeMapping): Promise<void> {
    const index = this.records.findIndex((current) => current.resource === record.resource && current.legacyId === record.legacyId)
    if (index >= 0) this.records[index] = record
    else this.records.push(record)
  }
}

class MemoryTargets implements BridgeTargetWriter {
  records: Array<{ id: string; resource: string; payload: Record<string, unknown> }> = []
  failLegacyId?: string

  async create(resource: string, legacyId: string, payload: Record<string, unknown>): Promise<{ id: string }> {
    if (legacyId === this.failLegacyId) throw new Error('target write failed')
    const id = `nodepress-${legacyId}`
    this.records.push({ id, resource, payload })
    return { id }
  }

  async update(id: string, resource: string, legacyId: string, payload: Record<string, unknown>): Promise<{ id: string }> {
    if (legacyId === this.failLegacyId) throw new Error('target write failed')
    const record = this.records.find((current) => current.id === id)
    if (!record) throw new Error('target not found')
    record.resource = resource
    record.payload = payload
    return { id }
  }
}
