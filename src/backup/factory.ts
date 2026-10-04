import prisma from '@/lib/prisma'
import { StorageDriverFactory } from '@/storage/StorageDriverFactory'
import { BackupService, createPrismaBackupRestoreDatabase, type BackupAuditEvent } from './service'
import { createPrismaBackupDataProvider } from './data'
import { LocalBackupStorage, S3BackupStorage, type BackupStorage } from './storage'

export async function getBackupService(options: { audit?: (event: BackupAuditEvent) => void | Promise<void> } = {}): Promise<BackupService> {
  const mediaStorage = await StorageDriverFactory.get()
  const provider = createPrismaBackupDataProvider(prisma as never, mediaStorage)
  const database = createPrismaBackupRestoreDatabase(prisma as never)
  return new BackupService({
    currentVersion: process.env.NODEPRESS_VERSION ?? process.env.npm_package_version ?? '0.4.6',
    provider,
    database,
    mediaStorage,
    audit: options.audit,
  })
}

export function getBackupArchiveStorage(env: NodeJS.ProcessEnv = process.env): BackupStorage {
  if (env.BACKUP_S3_ACCESS_KEY && env.BACKUP_S3_SECRET_KEY && env.BACKUP_S3_BUCKET && env.BACKUP_S3_REGION) {
    return new S3BackupStorage({
      accessKeyId: env.BACKUP_S3_ACCESS_KEY,
      secretAccessKey: env.BACKUP_S3_SECRET_KEY,
      bucket: env.BACKUP_S3_BUCKET,
      region: env.BACKUP_S3_REGION,
      endpoint: env.BACKUP_S3_ENDPOINT || undefined,
    })
  }
  return new LocalBackupStorage(env.BACKUP_LOCAL_ROOT ?? './data/backups')
}
