import { describe, expect, it } from 'vitest'
import { isBackupDue, runScheduledBackupIfDue } from '@/backup/scheduler'

describe('scheduled backups', () => {
  const now = new Date('2026-10-04T12:00:00.000Z')

  it('is disabled unless an explicit schedule is configured', () => {
    expect(isBackupDue('disabled', undefined, now)).toBe(false)
    expect(isBackupDue(undefined, undefined, now)).toBe(false)
  })

  it('runs daily and weekly schedules only after their interval', () => {
    expect(isBackupDue('daily', '2026-10-03T11:59:59.000Z', now)).toBe(true)
    expect(isBackupDue('daily', '2026-10-04T11:59:59.000Z', now)).toBe(false)
    expect(isBackupDue('weekly', '2026-09-26T11:59:59.000Z', now)).toBe(true)
  })

  it('writes a package and returns its key when the schedule is due', async () => {
    const writes: string[] = []
    const result = await runScheduledBackupIfDue({
      schedule: 'daily',
      lastRunAt: '2026-10-03T11:59:59.000Z',
      now,
      service: { export: async () => ({ manifest: {}, database: {}, media: [], extensions: {} }) as any },
      storage: { write: async (key) => { writes.push(key); return key }, read: async () => undefined, delete: async () => {} },
    })

    expect(result?.ranAt).toBe(now.toISOString())
    expect(writes[0]).toMatch(/^scheduled\/2026-10-04T12-00-00-000Z\.json$/)
  })
})
