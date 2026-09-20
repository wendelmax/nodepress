import { auth } from '@/auth'
import { contentTypeRegistry } from '@/modules/content'
import { ContentService } from '@/modules/content/content.service'
import { PrismaContentRepository } from '@/modules/content/prisma-repository'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { errorResponse, NodePressError } from '@/core/errors'

const service = new ContentService(contentTypeRegistry, new PrismaContentRepository())

export async function GET() {
  try {
    await ensureActivePluginsLoaded()
    if (!contentTypeRegistry.get('animal')) throw new NodePressError('CONFLICT', 'Plugin is inactive', 409)

    const session = await auth()
    const records = await service.list('animal')
    const isAdmin = session?.user && (session.user as { role?: string }).role === 'admin'
    return Response.json({ records: isAdmin ? records : records.filter((record) => record.status === 'publish') })
  } catch (error) {
    return errorResponse(error, 'Unable to list animals')
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureActivePluginsLoaded()
    if (!contentTypeRegistry.get('animal')) throw new NodePressError('CONFLICT', 'Plugin is inactive', 409)
    const body = await request.json() as { title?: string; slug?: string; status?: 'draft' | 'publish' | 'archived'; data?: Record<string, unknown> }
    const data = body.data ?? {}
    const record = await service.create({
      contentType: 'animal',
      title: body.title ?? String(data.name ?? ''),
      slug: body.slug,
      status: body.status,
      data,
    })
    return Response.json({ record }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Unable to create animal')
  }
}
