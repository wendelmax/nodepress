import { parseTarget, readJson, requireBuilderActor, serviceError } from '@/app/api/admin/builder/_shared'

type Params = { targetType: string; targetKey: string }

async function targetFrom(params: Promise<Params>) {
  const value = await params
  return parseTarget(value.targetType, value.targetKey)
}

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    return Response.json(await access.service.getTarget(access.actor, await targetFrom(params)))
  } catch (error) {
    return serviceError(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const access = await requireBuilderActor(request)
  if ('response' in access) return access.response
  try {
    const target = await targetFrom(params)
    const body = await readJson(request)
    return Response.json(await access.service.save(access.actor, target, {
      document: body.document,
      expectedVersion: body.expectedVersion as number,
      note: typeof body.note === 'string' ? body.note : undefined,
      mode: body.mode === 'client' ? 'client' : 'editor',
      requestId: access.requestId,
    }))
  } catch (error) {
    return serviceError(error)
  }
}
