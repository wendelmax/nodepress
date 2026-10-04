import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { PostService } from '@/services/post.service'
import { OptionService } from '@/services/option.service'
import { getBackupService } from '@/backup/factory'
import { getBackupArchiveStorage } from '@/backup/factory'
import { runScheduledBackupIfDue } from '@/backup/scheduler'
import { recordAuditEvent } from '@/audit/record'
import { createLeadDeliveryWorker } from '@/modules/delivery'
import prisma from '@/lib/prisma'
import { pruneLeadsByRetention, type LeadRetentionStore } from '@/modules/leads'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const secretFromUrl = url.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')

    // 1. Get Secret from Env or Database
    let configuredSecret = process.env.CRON_SECRET
    if (!configuredSecret) {
      const options = await OptionService.getOptions(['cron_secret'])
      configuredSecret = options['cron_secret']
    }

    if (!configuredSecret) {
      return NextResponse.json({ error: 'Cron secret not configured in server' }, { status: 500 })
    }

    // 2. Validate Authentication
    const isUrlAuth = secretFromUrl === configuredSecret
    const isHeaderAuth = authHeader === `Bearer ${configuredSecret}`

    if (!isUrlAuth && !isHeaderAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Execute Background Task
    const publishedCount = await PostService.publishScheduledPosts()
    const deliverySummary = await createLeadDeliveryWorker().process({
      limit: boundedInteger(process.env.FORMS_DELIVERY_BATCH_SIZE, 50),
    })
    const retentionOptions = await OptionService.getOptions(['lgpd_retention_days'])
    let prunedLeadCount = 0
    try {
      prunedLeadCount = await pruneLeadsByRetention(prisma.leadRecord as unknown as LeadRetentionStore, {
        retentionDays: Number(retentionOptions.lgpd_retention_days),
        batchSize: 100,
      })
    } catch (error) {
      console.error('Lead retention cleanup failed:', error instanceof Error ? error.message : error)
    }

    // 4. Revalidate cache if something changed
    if (publishedCount > 0) {
      // @ts-ignore
      revalidateTag('posts')
    }

    const backupOptions = await OptionService.getOptions(['backup_schedule', 'backup_last_run_at'])
    const backupService = backupOptions.backup_schedule
      ? await getBackupService()
      : undefined
    const scheduledBackup = backupService
      ? await runScheduledBackupIfDue({
        schedule: backupOptions.backup_schedule,
        lastRunAt: backupOptions.backup_last_run_at,
        service: backupService,
        storage: getBackupArchiveStorage(),
      })
      : undefined
    if (scheduledBackup) {
      await OptionService.saveOptions({ backup_last_run_at: scheduledBackup.ranAt })
      recordAuditEvent(undefined, {
        action: 'backup.scheduled.completed',
        resourceType: 'backup',
        resourceId: scheduledBackup.key,
        success: true,
        metadata: { ranAt: scheduledBackup.ranAt },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Cron executed successfully. Published ${publishedCount} scheduled posts.`,
      scheduledBackup,
      deliverySummary,
      prunedLeadCount,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('CRON Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

function boundedInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 500 ? parsed : fallback
}
