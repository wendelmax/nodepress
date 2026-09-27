import { NextResponse } from 'next/server'
import { themeTemplateService } from '@/services/theme-template.service'
import { requireThemeTemplateAdmin } from '../../_shared'

export async function POST(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const access = await requireThemeTemplateAdmin()
  if ('response' in access) return access.response
  const { templateId } = await context.params
  const body = await request.json() as { version?: number }
  if (!Number.isInteger(body.version) || (body.version ?? 0) < 1) return NextResponse.json({ error: 'Version is required.' }, { status: 400 })
  const template = await themeTemplateService.rollback(templateId, body.version as number)
  if (!template) return NextResponse.json({ error: 'Template or version not found.' }, { status: 404 })
  return NextResponse.json({ template })
}
