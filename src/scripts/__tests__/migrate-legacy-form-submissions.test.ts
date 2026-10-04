import { describe, expect, it, vi } from 'vitest'
import { migrateLegacyFormSubmissions } from '../migrate-legacy-form-submissions'

describe('legacy form migration', () => {
  it('is idempotent and keeps legacy rows untouched', async () => {
    const formSubmission = {
      findMany: vi.fn().mockResolvedValue([
        { id: 12, formId: '42', payload: JSON.stringify({ email: 'ada@example.test' }), createdAt: new Date('2026-10-01T00:00:00.000Z') },
      ]),
    }
    const formEngineSubmission = { upsert: vi.fn().mockResolvedValue({}) }
    const leadRecord = { upsert: vi.fn().mockResolvedValue({}) }

    const first = await migrateLegacyFormSubmissions({ formSubmission, formEngineSubmission, leadRecord })
    const second = await migrateLegacyFormSubmissions({ formSubmission, formEngineSubmission, leadRecord })

    expect(first).toEqual({ scanned: 1, migrated: 1, skipped: 0 })
    expect(second).toEqual(first)
    expect(formEngineSubmission.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'legacy-submission-12' },
    }))
    expect(leadRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sourceSubmissionId: 'legacy-submission-12' },
    }))
  })
})
