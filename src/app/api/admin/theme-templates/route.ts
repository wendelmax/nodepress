import { NextResponse } from 'next/server'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import { parseThemeTemplateDraft } from '@/lib/themes/templates'
import { themes } from '@/themes/registry'
import { themeTemplateService } from '@/services/theme-template.service'
import { requireThemeTemplateAdmin } from './_shared'

export async function GET(request: Request) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const themeSlug = new URL(request.url).searchParams.get('theme') ?? undefined
  return NextResponse.json({ templates: await themeTemplateService.list(themeSlug) })
}

export async function POST(request: Request) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  try {
    const body = await request.json()
    const config = await getServerPuckConfig('template')
    const parsed = parseThemeTemplateDraft(body, new Set(Object.keys(config.components)))
    if (!parsed.valid) return NextResponse.json({ error: parsed.reason }, { status: 400 })
    if (!themes[parsed.draft.themeSlug as keyof typeof themes]) return NextResponse.json({ error: 'Theme is not registered.' }, { status: 400 })
    const template = await themeTemplateService.create(parsed.draft)
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ error: 'A template with this id already exists for the theme.' }, { status: 409 })
    console.error('Failed to create theme template', error)
    return NextResponse.json({ error: 'Failed to create theme template.' }, { status: 500 })
  }
}
