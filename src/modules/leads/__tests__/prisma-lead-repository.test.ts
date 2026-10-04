import { describe, expect, it, vi } from 'vitest'
import { PrismaLeadRepository } from '../prisma-lead-repository'

describe('PrismaLeadRepository', () => {
  it('upserts a lead by its source submission and lists newest records first', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'lead-1' })
    const findMany = vi.fn().mockResolvedValue([])
    const repository = new PrismaLeadRepository({ findUnique: vi.fn(), upsert, findMany })
    const lead = {
      id: 'lead-1',
      sourceSubmissionId: 'submission-1',
      sourceFormId: 'form-1',
      data: { email: 'ada@example.test' },
      status: 'new' as const,
      version: 1,
      createdAt: new Date('2026-10-04T12:00:00.000Z'),
      updatedAt: new Date('2026-10-04T12:00:00.000Z'),
    }

    await repository.save(lead)
    await repository.list()

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sourceSubmissionId: 'submission-1' },
      create: expect.objectContaining({ id: 'lead-1', status: 'new', version: 1 }),
    }))
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } })
  })
})
