import { auth } from '@/auth'
import { contentTypeRegistry } from '@/modules/content'
import { ContentService } from '@/modules/content/content.service'
import { PrismaContentRepository } from '@/modules/content/prisma-repository'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { errorResponse, NodePressError } from '@/core/errors'

const service = new ContentService(contentTypeRegistry, new PrismaContentRepository())

async function requireAdmin() {
  const session = await auth()
  return (session?.user as { role?: string } | undefined)?.role === 'admin'
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    await ensureActivePluginsLoaded()
    if (!contentTypeRegistry.get('animal')) throw new NodePressError('CONFLICT', 'Plugin is inactive', 409)
    const { id } = await params
    const body = await request.json() as { title?: string; slug?: string; data?: Record<string, unknown> }
    return Response.json({ record: await service.update(id, body) })
  } catch (error) {
    return errorResponse(error, 'Unable to update animal')
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    await ensureActivePluginsLoaded()
    if (!contentTypeRegistry.get('animal')) throw new NodePressError('CONFLICT', 'Plugin is inactive', 409)
    await service.remove((await params).id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return errorResponse(error, 'Unable to remove animal')
  }
}
