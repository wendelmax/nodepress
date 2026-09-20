import { requireAdmin } from '../../_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  const result = await requireAdmin()
  if ('response' in result) return result.response

  const { pluginId } = await params
  try {
    return Response.json(await result.service.deactivate(pluginId))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Plugin deactivation failed'
    const status = /unknown plugin/i.test(message) ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
