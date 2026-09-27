import { errorResponse, getLandingPageService, requireLandingPageAdmin } from '../../_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    const id = (await params).id
    const service = getLandingPageService()
    await service.get(id)
    const preview = service.createPreviewToken(id)
    return Response.json({ ...preview, url: `/preview/landing-pages/${id}?token=${encodeURIComponent(preview.token)}` })
  } catch (error) {
    return errorResponse(error)
  }
}
