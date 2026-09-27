import { getServerPuckConfig } from '@/lib/puck/server-config'
import { NextResponse } from 'next/server'
import { parsePatternPackage } from '@/lib/puck/patterns'
import { patternService } from '@/services/pattern.service'
import { requirePatternAdmin } from './_shared'

function json(body: unknown, init?: ResponseInit): Response {
  return NextResponse.json(body, init) as Response
}

export async function GET(request: Request): Promise<Response> {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response

  const { searchParams } = new URL(request.url)
  const patterns = await patternService.list({
    search: searchParams.get('search') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    tag: searchParams.get('tag') ?? undefined,
    includeArchived: searchParams.get('includeArchived') === 'true',
  })
  return json({ patterns })
}

export async function POST(request: Request): Promise<Response> {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response

  try {
    const body = await request.json()
    const config = await getServerPuckConfig('page')
    const parsed = parsePatternPackage(body, new Set(Object.keys(config.components)))
    if (!parsed.valid) return json({ error: parsed.reason }, { status: 400 })

    const pattern = await patternService.create(parsed.package)
    return json({ pattern }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return json({ error: 'A pattern with this id already exists.' }, { status: 409 })
    }
    console.error('Failed to create builder pattern', error)
    return json({ error: 'Failed to create pattern.' }, { status: 500 })
  }
}
