import { describe, expect, it, vi } from 'vitest'
import { calculateLeadRetentionCutoff, pruneLeadsByRetention, redactLeadData } from '../retention'

describe('lead retention', () => {
  it('calculates a bounded retention cutoff', () => {
    const now = new Date('2026-10-04T12:00:00.000Z')
    expect(calculateLeadRetentionCutoff(now, 90)).toEqual(new Date('2026-07-06T12:00:00.000Z'))
    expect(calculateLeadRetentionCutoff(now, 30)).toEqual(new Date('2026-09-04T12:00:00.000Z'))
  })

  it('prunes in bounded batches and redacts delivery secrets', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'lead-1' }, { id: 'lead-2' }])
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 })

    await expect(pruneLeadsByRetention({ findMany, deleteMany }, {
      now: new Date('2026-10-04T12:00:00.000Z'),
      retentionDays: 90,
      batchSize: 2,
    })).resolves.toBe(2)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }))
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['lead-1', 'lead-2'] } } })
    expect(redactLeadData({ email: 'ada@example.test', apiKey: 'secret', nested: { password: 'hidden' } })).toEqual({
      email: 'ada@example.test',
      nested: {},
    })
  })
})
