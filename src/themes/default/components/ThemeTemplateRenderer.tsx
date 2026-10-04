import type React from 'react'
import BlockRenderer from './BlockRenderer'
import { replaceThemeSlots } from '@/lib/themes/templates'
import type { ThemeTemplateArea, ThemeTemplateContext } from '@/lib/themes/templates'
import { ThemeService } from '@/services/theme.service'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import { parseThemeTemplateDocument } from '@/lib/themes/templates'

interface ThemeTemplateRendererProps {
  area: ThemeTemplateArea
  context?: ThemeTemplateContext
  postType?: string
  slug?: string
  taxonomies?: Array<{ taxonomy: string; slug: string }>
  slots?: Record<string, unknown[]>
  fallback: React.ReactNode
}

export default async function ThemeTemplateRenderer({
  area,
  context,
  postType,
  slug,
  taxonomies,
  slots = {},
  fallback,
}: ThemeTemplateRendererProps) {
  const template = await ThemeService.resolveTemplate({
    area,
    context,
    postType,
    slug,
    taxonomies,
  })

  if (!template) return fallback

  let document: Parameters<typeof JSON.stringify>[0]
  const builderContext = area === 'page' ? 'page' : area === 'single' ? 'post' : 'template'
  try {
    const config = await getServerPuckConfig(builderContext)
    const parsed = parseThemeTemplateDocument(template.document, new Set(Object.keys(config.components)))
    if (!parsed.valid) return fallback
    document = replaceThemeSlots(parsed.document, slots)
  } catch {
    return fallback
  }
  return <BlockRenderer content={JSON.stringify(document)} context={builderContext} />
}
