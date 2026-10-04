import {
  errorResponse,
  getLandingPageService,
  parseLandingPageUpdate,
  requireLandingPageAdmin,
} from '../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    return Response.json(await getLandingPageService().get((await params).id))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    const body = await request.json() as Record<string, unknown>
    return Response.json(await getLandingPageService().update((await params).id, parseLandingPageUpdate(body)))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    return Response.json(await getLandingPageService().archive((await params).id))
  } catch (error) {
    return errorResponse(error)
  }
}
