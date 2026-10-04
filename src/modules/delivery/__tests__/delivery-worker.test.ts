import { describe, expect, it, vi } from 'vitest'
import { DeliveryWorker, type DeliveryWorkerStore } from '../delivery-worker'
import type { DeliveryRecord } from '../prisma-delivery-repository'

function record(overrides: Partial<DeliveryRecord> = {}): DeliveryRecord {
  return {
    id: 'delivery-1',
    eventId: 'event-1',
    targetId: 'webhook:crm',
    payload: { leadId: 'lead-1' },
    status: 'pending',
    attempts: 0,
    nextAttemptAt: new Date('2026-10-04T12:00:00.000Z'),
    createdAt: new Date('2026-10-04T11:00:00.000Z'),
    updatedAt: new Date('2026-10-04T11:00:00.000Z'),
    ...overrides,
  }
}

function store(records: DeliveryRecord[]): DeliveryWorkerStore & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async findDue() { return records },
    async markDelivered(id) { calls.push(`delivered:${id}`) },
    async markRetryable(id, nextAttemptAt, lastError) { calls.push(`retryable:${id}:${nextAttemptAt.toISOString()}:${lastError}`) },
    async markFailed(id, lastError) { calls.push(`failed:${id}:${lastError}`) },
  }
}

describe('DeliveryWorker', () => {
  it('delivers pending records in a bounded batch', async () => {
    const repository = store([record(), record({ id: 'delivery-2', eventId: 'event-2' })])
    const deliver = vi.fn().mockResolvedValue(undefined)
    const worker = new DeliveryWorker({ repository, deliver })

    const result = await worker.process({ now: new Date('2026-10-04T12:00:00.000Z'), limit: 1 })

    expect(result).toEqual({ selected: 2, delivered: 2, retryable: 0, failed: 0 })
    expect(deliver).toHaveBeenCalledTimes(2)
    expect(repository.calls).toEqual(['delivered:delivery-1', 'delivered:delivery-2'])
  })

  it('schedules a transient failure with exponential backoff', async () => {
    const repository = store([record()])
    const worker = new DeliveryWorker({ repository, deliver: async () => { throw new Error('provider unavailable') } })

    const result = await worker.process({ now: new Date('2026-10-04T12:00:00.000Z') })

    expect(result).toMatchObject({ selected: 1, delivered: 0, retryable: 1, failed: 0 })
    expect(repository.calls[0]).toBe('retryable:delivery-1:2026-10-04T12:01:00.000Z:provider unavailable')
  })

  it('marks the final failed attempt permanently', async () => {
    const repository = store([record({ attempts: 2 })])
    const worker = new DeliveryWorker({ repository, deliver: async () => { throw new Error('permanent failure') } })

    const result = await worker.process({ now: new Date('2026-10-04T12:00:00.000Z') })

    expect(result).toEqual({ selected: 1, delivered: 0, retryable: 0, failed: 1 })
    expect(repository.calls).toEqual(['failed:delivery-1:permanent failure'])
  })
})
