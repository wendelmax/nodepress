import { parseTarget, readJson, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string }

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const value = await params
    return Response.json(await access.service.listComments(access.actor, parseTarget(value.targetType, value.targetKey)))
  } catch (error) {
    return serviceError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const value = await params
    const body = await readJson(request)
    return Response.json(await access.service.createComment(
      access.actor,
      parseTarget(value.targetType, value.targetKey),
      {
        body: typeof body.body === 'string' ? body.body : '',
        anchor: typeof body.anchor === 'string' ? body.anchor : undefined,
        revisionId: typeof body.revisionId === 'string' ? body.revisionId : undefined,
      },
    ), { status: 201 })
  } catch (error) {
    return serviceError(error)
  }
}
