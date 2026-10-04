import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBackupService } from '@/backup/factory'
import { recordAuditEvent } from '@/audit/record'
import { errorResponse } from '@/core/errors'

export async function POST(request: Request) {
  const session = await auth()
  const role = session?.user ? (session.user as { role?: string }).role : undefined
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    let pkg: any
    try {
      pkg = JSON.parse(await file.text())
    } catch {
      return NextResponse.json({ error: 'Invalid backup JSON' }, { status: 400 })
    }
    if (!pkg || typeof pkg !== 'object' || !pkg.manifest || !pkg.database || !Array.isArray(pkg.media) || !pkg.extensions) {
      return NextResponse.json({ error: 'Invalid NodePress backup package' }, { status: 400 })
    }

    const confirm = formData.get('confirm') === 'true'
    const dryRun = !confirm || formData.get('dryRun') === 'true'
    const audit = (event: Parameters<typeof recordAuditEvent>[1]) => recordAuditEvent(request, {
      ...event,
      actorUserId: Number((session.user as { id?: string | number }).id) || undefined,
    })
    const service = await getBackupService({
      audit: (event) => audit({
        action: event.action,
        resourceType: 'backup',
        resourceId: event.operationId,
        success: event.success,
        metadata: { stage: event.stage, ...event.details },
      }),
    })
    const options = {
      confirm,
      dryRun,
      fromUrl: stringValue(formData.get('fromUrl')),
      toUrl: stringValue(formData.get('toUrl')),
    }
    const result = dryRun ? await service.dryRun(pkg, options) : await service.restore(pkg, options)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return errorResponse(error, 'Backup import failed', { endpoint: 'backup-import' })
  }
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
