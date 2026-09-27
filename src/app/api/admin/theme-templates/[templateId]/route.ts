import { NextResponse } from 'next/server'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import { parseThemeTemplateDraft } from '@/lib/themes/templates'
import { themes } from '@/themes/registry'
import { themeTemplateService } from '@/services/theme-template.service'
import { requireThemeTemplateAdmin } from '../_shared'

type Context = { params: Promise<{ templateId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const { templateId } = await context.params
  const template = await themeTemplateService.get(templateId)
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PUT(request: Request, context: Context) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const { templateId } = await context.params
  const body = await request.json()
  const config = await getServerPuckConfig('template')
  const parsed = parseThemeTemplateDraft(body, new Set(Object.keys(config.components)))
  if (!parsed.valid) return NextResponse.json({ error: parsed.reason }, { status: 400 })
  if (!themes[parsed.draft.themeSlug as keyof typeof themes]) return NextResponse.json({ error: 'Theme is not registered.' }, { status: 400 })
  const template = await themeTemplateService.update(templateId, parsed.draft)
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  return NextResponse.json({ template })
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const { templateId } = await context.params
  const template = await themeTemplateService.setEnabled(templateId, false)
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  return NextResponse.json({ template })
}
