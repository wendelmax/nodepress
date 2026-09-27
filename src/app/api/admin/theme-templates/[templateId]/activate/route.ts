import { NextResponse } from 'next/server'
import { themeTemplateService } from '@/services/theme-template.service'
import { requireThemeTemplateAdmin } from '../../_shared'

export async function POST(_request: Request, context: { params: Promise<{ templateId: string }> }) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const { templateId } = await context.params
  const template = await themeTemplateService.setEnabled(templateId, true)
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  return NextResponse.json({ template })
}
