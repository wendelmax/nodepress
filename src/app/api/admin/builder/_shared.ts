import { randomUUID } from 'node:crypto'
import { auth } from '@/auth'
import { getBuilderService } from '@/modules/builder-collaboration/factory'
import {
  BuilderServiceError,
  BuilderInvalidDocumentError,
} from '@/modules/builder-collaboration/errors'
import type { BuilderTargetRef } from '@/modules/builder-collaboration/domain'

const TARGET_TYPES = new Set<BuilderTargetRef['type']>(['post', 'option', 'tokens'])

export async function requireBuilderActor(request: Request) {
  const session = await auth()
  const user = session?.user as { id?: string | number; role?: string } | undefined
  if (!user?.id) {
    return { response: Response.json({ code: 'builder_unauthorized', error: 'Authentication is required' }, { status: 401 }) }
  }

  return {
    actor: { id: String(user.id), role: user.role },
    service: getBuilderService(),
    requestId: request.headers.get('x-request-id')?.trim() || randomUUID(),
  }
}

export function parseTarget(targetType: string, targetKey: string): BuilderTargetRef {
  if (!TARGET_TYPES.has(targetType as BuilderTargetRef['type'])) {
    throw new BuilderInvalidDocumentError('Unknown Builder target type')
  }
  let key: string
  try {
    key = decodeURIComponent(targetKey).trim()
  } catch {
    throw new BuilderInvalidDocumentError('Invalid Builder target key')
  }
  if (!key || key.length > 191) throw new BuilderInvalidDocumentError('Invalid Builder target key')
  if (targetType === 'post' && !/^\d+$/.test(key)) {
    throw new BuilderInvalidDocumentError('Post target key must be numeric')
  }
  return { type: targetType as BuilderTargetRef['type'], key }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new BuilderInvalidDocumentError('Request body must be valid JSON')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BuilderInvalidDocumentError('Request body must be an object')
  }
  return body as Record<string, unknown>
}

export function serviceError(error: unknown): Response {
  if (error instanceof BuilderServiceError) {
    return Response.json({ code: error.code, error: error.message }, { status: error.status })
  }
  console.error('Builder collaboration request failed', error)
  return Response.json({ code: 'builder_internal_error', error: 'Builder operation failed' }, { status: 500 })
}
