import { errorResponse } from '@/core/errors'
import { getMigrationAdminService } from '@/migrations/legacy-bridge/admin-service'
import { requireMigrationPermission } from '../_authorization'

export async function GET(request: Request) {
  const authorization = await requireMigrationPermission('migration.read')
  if ('response' in authorization) return authorization.response
  const resource = new URL(request.url).searchParams.get('resource') || undefined
  try {
    return Response.json({ runs: await getMigrationAdminService().listRuns(resource) })
  } catch (error) {
    return errorResponse(error, 'Migration lookup failed', { operation: 'migration.list', resource })
  }
}

export async function POST(request: Request) {
  const authorization = await requireMigrationPermission('migration.run')
  if ('response' in authorization) return authorization.response
  try {
    const body = await request.json() as { resource?: string; runId?: string; watermark?: string }
    const resource = body.resource
    if (!resource || !body.runId) return Response.json({ error: 'Invalid migration request' }, { status: 400 })
    return Response.json(await getMigrationAdminService().startRun({ resource: resource as never, runId: body.runId, watermark: body.watermark }), { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Migration start failed', { operation: 'migration.start' })
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireMigrationPermission('migration.run')
  if ('response' in authorization) return authorization.response
  const runId = new URL(request.url).searchParams.get('runId')
  if (!runId) return Response.json({ error: 'Migration run id is required' }, { status: 400 })
  try {
    return Response.json(await getMigrationAdminService().cancelRun(runId))
  } catch (error) {
    return errorResponse(error, 'Migration cancellation failed', { operation: 'migration.cancel', runId })
  }
}
