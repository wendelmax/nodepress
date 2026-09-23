import { requireAdmin } from '../../_shared'
import { errorResponse } from '@/core/errors'

export async function POST(_request: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  const result = await requireAdmin()
  if ('response' in result) return result.response

  const { pluginId } = await params
  try {
    return Response.json(await result.service.activate(pluginId))
  } catch (error) {
    return errorResponse(error, 'Plugin activation failed', { pluginId })
  }
}
