import { describe, expect, it, vi } from 'vitest'
import { PrismaDeliveryRepository } from '../prisma-delivery-repository'

describe('PrismaDeliveryRepository', () => {
  it('creates an idempotent pending delivery and claims due records', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'delivery-1', status: 'pending' })
    const findMany = vi.fn().mockResolvedValue([])
    const repository = new PrismaDeliveryRepository({ upsert, findMany })

    await repository.enqueue({
      eventId: 'event-1',
      targetId: 'webhook:crm',
      payload: { leadId: 'lead-1' },
    })
    await repository.findDue(new Date('2026-10-04T12:00:00.000Z'), 20)

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventId_targetId: { eventId: 'event-1', targetId: 'webhook:crm' } },
      create: expect.objectContaining({ eventId: 'event-1', targetId: 'webhook:crm', status: 'pending', attempts: 0 }),
    }))
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ['pending', 'retryable'] }, nextAttemptAt: { lte: new Date('2026-10-04T12:00:00.000Z') } },
      take: 20,
    }))
  })
})
