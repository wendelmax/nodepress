import { describe, expect, it, vi } from 'vitest'
import { PrismaFormSubmissionIdempotencyRepository } from '../prisma-submission-repository'

describe('PrismaFormSubmissionIdempotencyRepository', () => {
  it('scopes idempotency lookups by form and key', async () => {
    const findFirst = vi.fn().mockResolvedValue({ orchestrationResult: { outcome: 'accepted' } })
    const repository = new PrismaFormSubmissionIdempotencyRepository({ findFirst, updateMany: vi.fn() })

    await repository.get('form-1', 'request-1')

    expect(findFirst).toHaveBeenCalledWith({
      where: { formId: 'form-1', idempotencyKey: 'request-1' },
      select: { orchestrationResult: true },
    })
  })

  it('persists the orchestrator result on the scoped submission', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const repository = new PrismaFormSubmissionIdempotencyRepository({ findFirst: vi.fn(), updateMany })
    const result = { outcome: 'deliveryPending' as const, submission: {} as never, leadId: 'lead-1', deliveryStatus: 'pending' as const }

    await repository.set('form-1', 'request-1', result)

    expect(updateMany).toHaveBeenCalledWith({
      where: { formId: 'form-1', idempotencyKey: 'request-1' },
      data: { orchestrationResult: result },
    })
  })
})
