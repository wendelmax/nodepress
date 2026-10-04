import {
  errorResponse,
  getLandingPageService,
  parseLandingPageUpdate,
  requireLandingPageAdmin,
} from '../../_shared'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const id = (await params).id
    const service = getLandingPageService()
    if (Object.keys(body).length > 0) await service.update(id, parseLandingPageUpdate(body))
    return Response.json(await service.publish(id))
  } catch (error) {
    return errorResponse(error)
  }
}
