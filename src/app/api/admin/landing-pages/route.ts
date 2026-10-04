import {
  errorResponse,
  getLandingPageService,
  parseLandingPageInput,
  requireLandingPageAdmin,
} from './_shared'

export async function GET() {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    return Response.json({ landingPages: await getLandingPageService().list() })
  } catch (error) {
    return errorResponse(error, 'Unable to list landing pages')
  }
}

export async function POST(request: Request) {
  const result = await requireLandingPageAdmin()
  if ('response' in result) return result.response

  try {
    const body = await request.json() as Record<string, unknown>
    const page = await getLandingPageService().create(parseLandingPageInput(body))
    return Response.json(page, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
