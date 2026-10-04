import { parseTarget, readJson, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string; commentId: string }

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const value = await params
    const body = await readJson(request)
    if (body.status !== 'open' && body.status !== 'resolved') {
      return Response.json({ code: 'builder_invalid_document', error: 'Comment status must be open or resolved' }, { status: 400 })
    }
    return Response.json(await access.service.updateComment(
      access.actor,
      parseTarget(value.targetType, value.targetKey),
      value.commentId,
      body.status,
    ))
  } catch (error) {
    return serviceError(error)
  }
}
