import type { BackupService } from './service'
import type { BackupStorage } from './storage'

export type BackupSchedule = 'disabled' | 'daily' | 'weekly'

export function isBackupDue(schedule: string | undefined, lastRunAt: string | undefined, now = new Date()): boolean {
  if (schedule !== 'daily' && schedule !== 'weekly') return false
  if (!lastRunAt) return true
  const lastRun = new Date(lastRunAt)
  if (Number.isNaN(lastRun.getTime())) return true
  const interval = schedule === 'daily' ? 24 * 60 * 60 * 1_000 : 7 * 24 * 60 * 60 * 1_000
  return now.getTime() - lastRun.getTime() >= interval
}

export async function runScheduledBackupIfDue(input: {
  schedule: string | undefined
  lastRunAt: string | undefined
  now?: Date
  service: Pick<BackupService, 'export'>
  storage: BackupStorage
}): Promise<{ key: string; ranAt: string } | undefined> {
  const now = input.now ?? new Date()
  if (!isBackupDue(input.schedule, input.lastRunAt, now)) return undefined
  const pkg = await input.service.export()
  const ranAt = now.toISOString()
  const key = `scheduled/${ranAt.replace(/[:.]/g, '-')}.json`
  await input.storage.write(key, Buffer.from(JSON.stringify(pkg, null, 2)), 'application/json')
  return { key, ranAt }
}
