import { NextResponse } from 'next/server'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import { parseThemeTemplateDraft } from '@/lib/themes/templates'
import { themes } from '@/themes/registry'
import { requireThemeTemplateAdmin } from '../_shared'

export async function POST(request: Request) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const body = await request.json()
  const config = await getServerPuckConfig('template')
  const parsed = parseThemeTemplateDraft(body, new Set(Object.keys(config.components)))
  if (!parsed.valid) return NextResponse.json({ valid: false, error: parsed.reason }, { status: 400 })
  if (!themes[parsed.draft.themeSlug as keyof typeof themes]) return NextResponse.json({ valid: false, error: 'Theme is not registered.' }, { status: 400 })
  return NextResponse.json({ valid: true, template: parsed.draft })
}
