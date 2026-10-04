import { parseTarget, readJson, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string }

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const value = await params
    const body = await readJson(request)
    return Response.json(await access.service.restore(
      access.actor,
      parseTarget(value.targetType, value.targetKey),
      typeof body.revisionId === 'string' ? body.revisionId : '',
      body.expectedVersion as number,
      access.requestId,
    ))
  } catch (error) {
    return serviceError(error)
  }
}
