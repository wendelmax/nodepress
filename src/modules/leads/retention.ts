export interface LeadRetentionStore {
  findMany(args: unknown): Promise<Array<{ id: string }>>
  deleteMany(args: unknown): Promise<{ count: number }>
}

export interface LeadRetentionOptions {
  now?: Date
  retentionDays?: number
  batchSize?: number
}

export function calculateLeadRetentionCutoff(now: Date, retentionDays = 365): Date {
  const days = boundedRetentionDays(retentionDays)
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1_000)
}

export async function pruneLeadsByRetention(store: LeadRetentionStore, options: LeadRetentionOptions = {}): Promise<number> {
  const now = options.now ?? new Date()
  const batchSize = boundedBatchSize(options.batchSize ?? 100)
  const cutoff = calculateLeadRetentionCutoff(now, options.retentionDays)
  const rows = await store.findMany({
    where: { createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
    select: { id: true },
  })
  if (rows.length === 0) return 0
  const result = await store.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } })
  return result.count
}

export function redactLeadData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLeadData)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/(token|secret|password|api[_-]?key|captcha)/i.test(key))
      .map(([key, nested]) => [key, redactLeadData(nested)]),
  )
}

function boundedRetentionDays(value: number): number {
  return Math.min(3650, Math.max(30, Number.isFinite(value) ? Math.round(value) : 365))
}

function boundedBatchSize(value: number): number {
  return Math.min(500, Math.max(1, Number.isInteger(value) ? value : 100))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
