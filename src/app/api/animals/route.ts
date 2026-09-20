import { auth } from '@/auth'
import { contentTypeRegistry } from '@/modules/content'
import { ContentService } from '@/modules/content/content.service'
import { PrismaContentRepository } from '@/modules/content/prisma-repository'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'

const service = new ContentService(contentTypeRegistry, new PrismaContentRepository())

export async function GET() {
  await ensureActivePluginsLoaded()
  if (!contentTypeRegistry.get('animal')) return Response.json({ error: 'Animals plugin is inactive' }, { status: 409 })

  const session = await auth()
  const records = await service.list('animal')
  const isAdmin = session?.user && (session.user as { role?: string }).role === 'admin'
  return Response.json({ records: isAdmin ? records : records.filter((record) => record.status === 'publish') })
}

export async function POST(request: Request) {
  const session = await auth()
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await ensureActivePluginsLoaded()
  if (!contentTypeRegistry.get('animal')) return Response.json({ error: 'Animals plugin is inactive' }, { status: 409 })

  try {
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
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to create animal' }, { status: 400 })
  }
}
