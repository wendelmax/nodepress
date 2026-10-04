export interface LegacyFormSubmissionRow {
  id: number
  formId: string
  payload: string
  createdAt: Date
}

export interface LegacySubmissionMigrationClient {
  formSubmission: { findMany(args: unknown): Promise<LegacyFormSubmissionRow[]> }
  formEngineSubmission: { upsert(args: unknown): Promise<unknown> }
  leadRecord: { upsert(args: unknown): Promise<unknown> }
}

export interface LegacyMigrationSummary {
  scanned: number
  migrated: number
  skipped: number
}

export async function migrateLegacyFormSubmissions(
  client: LegacySubmissionMigrationClient,
  options: { limit?: number } = {},
): Promise<LegacyMigrationSummary> {
  const rows = await client.formSubmission.findMany({
    orderBy: { id: 'asc' },
    take: boundedLimit(options.limit ?? 500),
  })
  const summary: LegacyMigrationSummary = { scanned: rows.length, migrated: 0, skipped: 0 }

  for (const row of rows) {
    const payload = parsePayload(row.payload)
    if (!payload) {
      summary.skipped += 1
      continue
    }

    const submissionId = `legacy-submission-${row.id}`
    const formId = `legacy-${row.formId}`
    await client.formEngineSubmission.upsert({
      where: { id: submissionId },
      create: {
        id: submissionId,
        formId,
        payload,
        createdAt: row.createdAt,
        orchestrationResult: { migratedFrom: 'np_form_submissions', legacyId: row.id },
      },
      update: {},
    })
    await client.leadRecord.upsert({
      where: { sourceSubmissionId: submissionId },
      create: {
        id: `legacy-lead-${row.id}`.slice(0, 30),
        sourceSubmissionId: submissionId,
        sourceFormId: formId,
        data: payload,
        status: 'new',
        version: 1,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      },
      update: {},
    })
    summary.migrated += 1
  }

  return summary
}

function parsePayload(payload: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(payload)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function boundedLimit(value: number): number {
  return Math.min(500, Math.max(1, Number.isInteger(value) ? value : 500))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function main(): Promise<void> {
  const { default: prisma } = await import('@/lib/prisma')
  const summary = await migrateLegacyFormSubmissions(prisma as unknown as LegacySubmissionMigrationClient)
  console.log(JSON.stringify(summary))
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/migrate-legacy-form-submissions.ts')) {
  void main().catch((error) => {
    console.error('Legacy form migration failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
