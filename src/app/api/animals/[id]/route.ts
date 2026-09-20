import { auth } from '@/auth'
import { contentTypeRegistry } from '@/modules/content'
import { ContentService } from '@/modules/content/content.service'
import { PrismaContentRepository } from '@/modules/content/prisma-repository'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'

const service = new ContentService(contentTypeRegistry, new PrismaContentRepository())

async function requireAdmin() {
  const session = await auth()
  return (session?.user as { role?: string } | undefined)?.role === 'admin'
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Forbidden' }, { status: 403 })
  await ensureActivePluginsLoaded()
  if (!contentTypeRegistry.get('animal')) return Response.json({ error: 'Animals plugin is inactive' }, { status: 409 })

  try {
    const { id } = await params
    const body = await request.json() as { title?: string; slug?: string; data?: Record<string, unknown> }
    return Response.json({ record: await service.update(id, body) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update animal'
    return Response.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Forbidden' }, { status: 403 })
  await ensureActivePluginsLoaded()
  if (!contentTypeRegistry.get('animal')) return Response.json({ error: 'Animals plugin is inactive' }, { status: 409 })

  try {
    await service.remove((await params).id)
    return new Response(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove animal'
    return Response.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 })
  }
}
