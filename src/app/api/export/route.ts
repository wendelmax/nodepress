import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBackupService } from '@/backup/factory'
import type { BackupSection } from '@/backup/types'
import { errorResponse } from '@/core/errors'
import { recordAuditEvent } from '@/audit/record'

const VALID_SECTIONS = new Set<BackupSection>(['users', 'posts', 'taxonomies', 'options'])

export async function GET(request: Request) {
  const session = await auth()
  const role = session?.user ? (session.user as { role?: string }).role : undefined
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const params = new URL(request.url).searchParams
    const sections = parseSections(params.get('sections'))
    const includeMediaValue = params.get('includeMedia')
    if (includeMediaValue !== null && includeMediaValue !== 'true' && includeMediaValue !== 'false') {
      return NextResponse.json({ error: 'Invalid includeMedia' }, { status: 400 })
    }
    const service = await getBackupService({
      audit: (event) => recordAuditEvent(request, {
        action: event.action,
        resourceType: 'backup',
        resourceId: event.operationId,
        actorUserId: Number((session.user as { id?: string | number }).id) || undefined,
        success: event.success,
        metadata: { stage: event.stage, ...event.details },
      }),
    })
    const pkg = await service.export({ sections, includeMedia: includeMediaValue === null ? true : includeMediaValue === 'true' })
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(pkg, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="nodepress-backup-${date}.json"`,
      },
    })
  } catch (error) {
    return errorResponse(error, 'Backup export failed', { endpoint: 'backup-export' })
  }
}

function parseSections(value: string | null): BackupSection[] | undefined {
  if (!value) return undefined
  const sections = [...new Set(value.split(',').map((section) => section.trim()).filter(Boolean))]
  if (sections.length === 0 || sections.some((section) => !VALID_SECTIONS.has(section as BackupSection))) throw new Error('Invalid backup sections')
  return sections as BackupSection[]
}
