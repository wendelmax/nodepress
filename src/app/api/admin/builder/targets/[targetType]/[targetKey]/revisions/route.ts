import { parseTarget, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string }

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const target = await params
    return Response.json(await access.service.listRevisions(access.actor, parseTarget(target.targetType, target.targetKey)))
  } catch (error) {
    return serviceError(error)
  }
}
