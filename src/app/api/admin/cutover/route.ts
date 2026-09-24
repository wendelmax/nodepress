import { errorResponse } from '@/core/errors'
import { getMigrationAdminService } from '@/migrations/legacy-bridge/admin-service'
import { cutoverStates, type CutoverState } from '@/migrations/legacy-bridge/cutover-state'
import { requireMigrationPermission } from '../_authorization'

export async function GET(request: Request) {
  const authorization = await requireMigrationPermission('cutover.prepare')
  if ('response' in authorization) return authorization.response
  const domain = new URL(request.url).searchParams.get('domain')
  if (!domain) return Response.json({ error: 'Cutover domain is required' }, { status: 400 })
  try {
    return Response.json(await getMigrationAdminService().getCutover(domain))
  } catch (error) {
    return errorResponse(error, 'Cutover lookup failed', { operation: 'cutover.get', domain })
  }
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => null) as { domain?: string; to?: string; reason?: string; reconciliation?: { status: 'passed' | 'failed'; blockingErrors: string[] } } | null
  const permission = body?.to === 'active' ? 'cutover.activate' : 'cutover.prepare'
  const authorization = await requireMigrationPermission(permission)
  if ('response' in authorization) return authorization.response
  if (!body?.domain || !body.to || !cutoverStates.includes(body.to as CutoverState)) {
    return Response.json({ error: 'Invalid cutover request' }, { status: 400 })
  }
  try {
    return Response.json(await getMigrationAdminService().changeCutover({
      domain: body.domain,
      to: body.to as CutoverState,
      reason: body.reason,
      reconciliation: body.reconciliation,
      changedBy: authorization.actor.id,
    }))
  } catch (error) {
    return errorResponse(error, 'Cutover change failed', { operation: 'cutover.change', domain: body.domain })
  }
}
