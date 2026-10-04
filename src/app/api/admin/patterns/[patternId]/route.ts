import { getServerPuckConfig } from '@/lib/puck/server-config'
import { NextResponse } from 'next/server'
import { parsePatternPackage } from '@/lib/puck/patterns'
import { patternService } from '@/services/pattern.service'
import { requirePatternAdmin } from '../_shared'

type RouteContext = { params: Promise<{ patternId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response
  const { patternId } = await context.params
  const pattern = await patternService.get(patternId)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found.' }, { status: 404 })
  return NextResponse.json({ pattern })
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response
  const { patternId } = await context.params

  try {
    const body = await request.json()
    const config = await getServerPuckConfig('page')
    const parsed = parsePatternPackage(body, new Set(Object.keys(config.components)))
    if (!parsed.valid) return NextResponse.json({ error: parsed.reason }, { status: 400 })
    const pattern = await patternService.update(patternId, parsed.package)
    if (!pattern) return NextResponse.json({ error: 'Pattern not found.' }, { status: 404 })
    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('Failed to update builder pattern', error)
    return NextResponse.json({ error: 'Failed to update pattern.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response
  const { patternId } = await context.params
  const archived = await patternService.archive(patternId)
  if (!archived) return NextResponse.json({ error: 'Pattern not found or already archived.' }, { status: 404 })
  return NextResponse.json({ archived: true })
}
