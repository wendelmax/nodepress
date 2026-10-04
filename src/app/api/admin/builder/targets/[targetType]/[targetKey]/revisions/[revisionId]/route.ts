import { parseTarget, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string; revisionId: string }

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const value = await params
    return Response.json(await access.service.getRevision(
      access.actor,
      parseTarget(value.targetType, value.targetKey),
      value.revisionId,
    ))
  } catch (error) {
    return serviceError(error)
  }
}
