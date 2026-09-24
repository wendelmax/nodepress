import type { BridgeResource } from './contracts'

export interface ReconciliationRecord {
  resource: BridgeResource
  legacyId: string
  checksum?: string
}

export interface ReconciliationSnapshot {
  expected: ReconciliationRecord[]
  imported: ReconciliationRecord[]
}

export interface ReconciliationStore {
  getSnapshot(runId: string): Promise<ReconciliationSnapshot>
}

export interface ReconciliationReport {
  runId: string
  status: 'passed' | 'failed'
  counts: {
    expected: number
    imported: number
    missing: number
    duplicates: number
    checksumMismatches: number
  }
  missing: string[]
  duplicates: string[]
  checksumMismatches: string[]
  blockingErrors: string[]
}

export class ReconciliationService {
  constructor(private readonly store: ReconciliationStore) {}

  async reconcile(runId: string): Promise<ReconciliationReport> {
    return reconcileSnapshot(runId, await this.store.getSnapshot(runId))
  }
}

export function reconcileSnapshot(runId: string, snapshot: ReconciliationSnapshot): ReconciliationReport {
  const expectedByKey = groupByKey(snapshot.expected)
  const importedByKey = groupByKey(snapshot.imported)
  const missing = [...expectedByKey.keys()]
    .filter((key) => !importedByKey.has(key))
    .sort()
    .map((key) => `missing:${key}`)
  const duplicates = [...new Set([...expectedByKey, ...importedByKey]
    .filter(([key]) => (expectedByKey.get(key)?.length ?? 0) > 1 || (importedByKey.get(key)?.length ?? 0) > 1)
    .map(([key]) => `duplicate:${key}`))]
    .sort()
  const checksumMismatches = [...expectedByKey.entries()]
    .flatMap(([key, expected]) => {
      const expectedChecksum = expected[0]?.checksum
      const imported = importedByKey.get(key) ?? []
      return expectedChecksum && imported.some((record) => record.checksum !== expectedChecksum)
        ? [`checksum:${key}`]
        : []
    })
    .sort()
  const blockingErrors = [...missing, ...duplicates, ...checksumMismatches]

  return {
    runId,
    status: blockingErrors.length ? 'failed' : 'passed',
    counts: {
      expected: snapshot.expected.length,
      imported: snapshot.imported.length,
      missing: missing.length,
      duplicates: duplicates.length,
      checksumMismatches: checksumMismatches.length,
    },
    missing,
    duplicates,
    checksumMismatches,
    blockingErrors,
  }
}

function groupByKey(records: ReconciliationRecord[]): Map<string, ReconciliationRecord[]> {
  const groups = new Map<string, ReconciliationRecord[]>()
  for (const record of records) {
    const key = `${record.resource}:${record.legacyId}`
    groups.set(key, [...(groups.get(key) ?? []), record])
  }
  return groups
}
