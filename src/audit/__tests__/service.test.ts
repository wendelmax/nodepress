import { describe, expect, it, vi } from 'vitest'
import { AuditLogService, getAuditRetentionDays } from '@/audit/service'
import type { AuditLogRepository } from '@/audit/service'

function createRepository(overrides: Partial<AuditLogRepository> = {}) {
  const repository: AuditLogRepository = {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    ...overrides,
  }
  return repository
}

describe('AuditLogService', () => {
  it('persists a sanitized event without rejecting when storage fails', async () => {
    const repository = createRepository({ create: vi.fn().mockRejectedValue(new Error('database unavailable')) })
    const logger = { error: vi.fn() }
    const service = new AuditLogService(repository, logger)

    await expect(service.record({
      action: 'auth.login.failed',
      resourceType: 'auth',
      success: false,
      metadata: { password: 'should-not-persist', identifier: 'admin' },
    })).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledOnce()
  })

  it('builds bounded filters and stable descending pagination', async () => {
    const repository = createRepository({
      findMany: vi.fn().mockResolvedValue([{ id: 4, action: 'post.updated' }]),
      count: vi.fn().mockResolvedValue(1),
    })
    const service = new AuditLogService(repository)

    const result = await service.list({
      page: 0,
      pageSize: 500,
      action: 'post.updated',
      actorUserId: 7,
      success: true,
    })

    expect(result).toEqual({ items: [{ id: 4, action: 'post.updated' }], total: 1, page: 1, pageSize: 100 })
    expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 100,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      where: {
        action: 'post.updated',
        actorUserId: 7,
        success: true,
      },
    }))
  })

  it('prunes old events in batches until no matching ids remain', async () => {
    const repository = createRepository({
      findMany: vi.fn()
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 3 }])
        .mockResolvedValueOnce([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    })
    const service = new AuditLogService(repository)
    const cutoff = new Date('2026-01-01T00:00:00.000Z')

    await expect(service.pruneOlderThan(cutoff, 2)).resolves.toBe(4)
    expect(repository.deleteMany).toHaveBeenNthCalledWith(1, { where: { id: { in: [1, 2] } } })
    expect(repository.deleteMany).toHaveBeenNthCalledWith(2, { where: { id: { in: [3] } } })
  })

  it('uses a bounded environment retention policy with a safe default', () => {
    expect(getAuditRetentionDays('180')).toBe(180)
    expect(getAuditRetentionDays('0')).toBe(90)
    expect(getAuditRetentionDays('not-a-number')).toBe(90)
  })

  it('derives the cleanup cutoff from the configured retention policy', async () => {
    const repository = createRepository()
    const service = new AuditLogService(repository)
    const now = new Date('2026-10-03T00:00:00.000Z')

    await service.pruneByRetention(now, 10, '180')

    expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdAt: { lt: new Date('2026-04-06T00:00:00.000Z') } },
    }))
  })
})
