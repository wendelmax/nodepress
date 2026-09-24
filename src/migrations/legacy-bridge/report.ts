import type { ReconciliationReport } from './reconciliation'

export function serializeReconciliationReport(report: ReconciliationReport): string {
  return JSON.stringify({
    runId: report.runId,
    status: report.status,
    counts: report.counts,
    missing: report.missing,
    duplicates: report.duplicates,
    checksumMismatches: report.checksumMismatches,
    blockingErrors: report.blockingErrors,
  })
}
