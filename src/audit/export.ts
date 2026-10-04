export type AuditLogExportRow = {
  id: number
  actorUserId: number | null
  tenantId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  success: boolean
  correlationId: string | null
  ipSummary: string | null
  metadata: unknown
  occurredAt: Date
  createdAt: Date
}

const CSV_COLUMNS = [
  'id', 'actorUserId', 'tenantId', 'action', 'resourceType', 'resourceId',
  'success', 'correlationId', 'ipSummary', 'metadata', 'occurredAt', 'createdAt',
] as const

export function escapeCsvValue(value: unknown): string {
  const text = value instanceof Date
    ? value.toISOString()
    : typeof value === 'string'
      ? value
      : JSON.stringify(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function serializeAuditLogs(rows: AuditLogExportRow[], format: 'json' | 'csv'): string {
  if (format === 'json') {
    return JSON.stringify({ items: rows })
  }

  const header = CSV_COLUMNS.join(',')
  const lines = rows.map((row) => CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','))
  return [header, ...lines].join('\n')
}
