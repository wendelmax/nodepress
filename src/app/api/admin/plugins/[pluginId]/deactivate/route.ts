import { requireAdmin } from '../../_shared'
import { errorResponse } from '@/core/errors'
import { recordAuditEvent } from '@/audit/record'

export async function POST(request: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  const result = await requireAdmin()
  if ('response' in result) return result.response

  const { pluginId } = await params
  try {
    const status = await result.service.deactivate(pluginId)
    recordAuditEvent(request, { action: 'plugin.deactivated', resourceType: 'plugin', resourceId: pluginId, actorUserId: result.actorUserId, success: true })
    return Response.json(status)
  } catch (error) {
    return errorResponse(error, 'Plugin deactivation failed', { pluginId })
  }
}
