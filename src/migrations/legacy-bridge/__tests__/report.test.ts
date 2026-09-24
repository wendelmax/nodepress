import { describe, expect, it } from 'vitest'
import { serializeReconciliationReport } from '../report'

describe('reconciliation report', () => {
  it('serializes a deterministic operational report without hidden payloads', () => {
    expect(serializeReconciliationReport({
      runId: 'run-1',
      status: 'failed',
      counts: { expected: 1, imported: 0, missing: 1, duplicates: 0, checksumMismatches: 0 },
      missing: ['missing:animals:legacy-1'],
      duplicates: [],
      checksumMismatches: [],
      blockingErrors: ['missing:animals:legacy-1'],
    })).toBe(JSON.stringify({
      runId: 'run-1',
      status: 'failed',
      counts: { expected: 1, imported: 0, missing: 1, duplicates: 0, checksumMismatches: 0 },
      missing: ['missing:animals:legacy-1'],
      duplicates: [],
      checksumMismatches: [],
      blockingErrors: ['missing:animals:legacy-1'],
    }))
  })
})
