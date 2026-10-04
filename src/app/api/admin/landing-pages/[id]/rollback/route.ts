import { errorResponse, getLandingPageService, requireLandingPageAdmin } from '../../_shared'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (typeof body.revisionId !== 'string' || !body.revisionId.trim()) {
      throw new Error('Landing page revisionId is required')
    }
    return Response.json(await getLandingPageService().rollback((await params).id, body.revisionId))
  } catch (error) {
    return errorResponse(error)
  }
}
