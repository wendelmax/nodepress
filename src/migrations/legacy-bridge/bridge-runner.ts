import { createHash } from 'node:crypto'
import type {
  BridgeResource,
  LegacyExportItem,
  LegacyExportPage,
  LegacyExportRequest,
  MigrationRunResult,
} from './contracts'

export interface LegacyPageClient {
  fetchPage(request: LegacyExportRequest): Promise<LegacyExportPage>
  lastRetryCount?: number
}

export interface BridgeMapping {
  runId: string
  resource: BridgeResource
  legacyId: string
  nodepressId: string
  checksum: string
  status: 'completed' | 'failed'
}

export interface BridgeMappingStore {
  find(resource: BridgeResource, legacyId: string): Promise<BridgeMapping | undefined>
  save(mapping: BridgeMapping): Promise<void>
}

export interface BridgeTargetWriter {
  create(resource: BridgeResource, legacyId: string, payload: Record<string, unknown>): Promise<{ id: string }>
  update(id: string, resource: BridgeResource, legacyId: string, payload: Record<string, unknown>): Promise<{ id: string }>
}

export interface BridgeRunnerDependencies {
  client: LegacyPageClient
  mappings: BridgeMappingStore
  targets: BridgeTargetWriter
}

export interface BridgeRunInput {
  resource: BridgeResource
  runId: string
  updatedSince?: string
  limit?: number
}

export class BridgeRunner {
  constructor(private readonly dependencies: BridgeRunnerDependencies) {}

  async run(input: BridgeRunInput): Promise<MigrationRunResult> {
    const result: MigrationRunResult = {
      runId: input.runId,
      resource: input.resource,
      status: 'running',
      imported: 0,
      created: 0,
      updated: 0,
      failed: 0,
      retried: 0,
    }
    let cursor: string | undefined
    let firstPage = true

    try {
      do {
        const page = await this.dependencies.client.fetchPage({
          resource: input.resource,
          runId: input.runId,
          ...(cursor ? { cursor } : {}),
          ...(firstPage && input.updatedSince ? { updatedSince: input.updatedSince } : {}),
          limit: Math.max(1, Math.min(100, Math.floor(input.limit ?? 100))),
        })
        result.retried += this.dependencies.client.lastRetryCount ?? 0
        if (page.resource !== input.resource || page.runId !== input.runId) {
          throw new Error('Legacy export page does not match the migration run')
        }

        for (const item of page.items) {
          await this.importItem(input, item, result)
        }
        cursor = page.nextCursor
        firstPage = false
      } while (cursor)
    } catch {
      result.failed += 1
    }

    result.status = result.failed > 0 ? 'failed' : 'passed'
    return result
  }

  private async importItem(input: BridgeRunInput, item: LegacyExportItem, result: MigrationRunResult): Promise<void> {
    try {
      const checksum = checksumForItem(item)
      const existing = await this.dependencies.mappings.find(input.resource, item.legacyId)
      if (existing) {
        await this.dependencies.targets.update(existing.nodepressId, input.resource, item.legacyId, item.payload)
        result.updated += 1
        await this.dependencies.mappings.save({
          ...existing,
          runId: input.runId,
          checksum,
          status: 'completed',
        })
      } else {
        const created = await this.dependencies.targets.create(input.resource, item.legacyId, item.payload)
        result.created += 1
        await this.dependencies.mappings.save({
          runId: input.runId,
          resource: input.resource,
          legacyId: item.legacyId,
          nodepressId: created.id,
          checksum,
          status: 'completed',
        })
      }
      result.imported += 1
    } catch {
      result.failed += 1
    }
  }
}

function checksumForItem(item: LegacyExportItem): string {
  return `sha256:${createHash('sha256').update(stableStringify(item.payload), 'utf8').digest('hex')}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
