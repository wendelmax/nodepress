import prisma from '@/lib/prisma'
import { sanitizeAuditMetadata } from './sanitize'
import type { AuditEvent, AuditQuery } from './types'
import { serializeAuditLogs, type AuditLogExportRow } from './export'

export interface AuditLogRepository {
  create(args: { data: Record<string, unknown> }): Promise<unknown>
  findMany(args: Record<string, unknown>): Promise<Array<Partial<AuditLogExportRow> & { id: number }>>
  count(args: Record<string, unknown>): Promise<number>
  deleteMany(args: Record<string, unknown>): Promise<{ count: number }>
}

export interface AuditLogLogger {
  error(message: string, error?: unknown): void
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100
const DEFAULT_RETENTION_DAYS = 90

export function getAuditRetentionDays(value = process.env.AUDIT_LOG_RETENTION_DAYS): number {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 3_650 ? parsed : DEFAULT_RETENTION_DAYS
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && value && value > 0 ? value : DEFAULT_PAGE
}

function normalizePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) return DEFAULT_PAGE_SIZE
  return Math.min(value, MAX_PAGE_SIZE)
}

function buildWhere(query: AuditQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (query.action) where.action = query.action
  if (query.resourceType) where.resourceType = query.resourceType
  if (query.resourceId) where.resourceId = query.resourceId
  if (query.actorUserId !== undefined) where.actorUserId = query.actorUserId
  if (query.tenantId) where.tenantId = query.tenantId
  if (query.success !== undefined) where.success = query.success
  if (query.from || query.to) {
    where.occurredAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    }
  }
  return where
}

export class AuditLogService {
  constructor(
    private readonly repository: AuditLogRepository,
    private readonly logger: AuditLogLogger = console,
  ) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.repository.create({
        data: {
          ...event,
          metadata: sanitizeAuditMetadata(event.metadata),
        },
      })
    } catch (error) {
      this.logger.error('audit.log.failed', error)
    }
  }

  async list(query: AuditQuery = {}): Promise<{ items: Array<Partial<AuditLogExportRow> & { id: number }>; total: number; page: number; pageSize: number }> {
    const page = normalizePage(query.page)
    const pageSize = normalizePageSize(query.pageSize)
    const where = buildWhere(query)
    const [items, total] = await Promise.all([
      this.repository.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      }),
      this.repository.count({ where }),
    ])
    return { items, total, page, pageSize }
  }

  async export(query: AuditQuery = {}, format: 'json' | 'csv' = 'json'): Promise<{ body: string; contentType: string; filename: string }> {
    const result = await this.list({ ...query, page: 1, pageSize: MAX_PAGE_SIZE })
    const body = serializeAuditLogs(result.items as AuditLogExportRow[], format)
    return {
      body,
      contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      filename: `audit-logs.${format}`,
    }
  }

  async pruneOlderThan(date: Date, batchSize = MAX_PAGE_SIZE): Promise<number> {
    const safeBatchSize = normalizePageSize(batchSize)
    let total = 0
    while (true) {
      const rows = await this.repository.findMany({
        where: { createdAt: { lt: date } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: safeBatchSize,
        select: { id: true },
      })
      if (rows.length === 0) return total
      const result = await this.repository.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } })
      total += result.count
      if (rows.length < safeBatchSize) return total
    }
  }

  async pruneByRetention(now = new Date(), batchSize = MAX_PAGE_SIZE, retentionValue?: string): Promise<number> {
    const cutoff = new Date(now.getTime() - getAuditRetentionDays(retentionValue) * 24 * 60 * 60 * 1_000)
    return this.pruneOlderThan(cutoff, batchSize)
  }
}

const defaultRepository: AuditLogRepository = {
  create: (args) => (prisma as unknown as { auditLog: AuditLogRepository }).auditLog.create(args),
  findMany: (args) => (prisma as unknown as { auditLog: AuditLogRepository }).auditLog.findMany(args),
  count: (args) => (prisma as unknown as { auditLog: AuditLogRepository }).auditLog.count(args),
  deleteMany: (args) => (prisma as unknown as { auditLog: AuditLogRepository }).auditLog.deleteMany(args),
}

export const auditLogService = new AuditLogService(defaultRepository)
export { DEFAULT_RETENTION_DAYS }
