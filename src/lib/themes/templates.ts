import { parseBuilderDocument, validateBuilderComponents } from '@/lib/puck/document'
import { validateBuilderLayoutDocument } from '@/lib/puck/layout/schema'
import type { BuilderDocument } from '@/lib/puck/types'

export const THEME_TEMPLATE_AREAS = ['header', 'footer', 'single', 'page', 'archive', '404'] as const
export type ThemeTemplateArea = typeof THEME_TEMPLATE_AREAS[number]
export type ThemeTemplateContext = 'home' | 'post' | 'page' | 'archive' | '404'

export interface ThemeTemplateConditions {
  context?: ThemeTemplateContext
  postType?: string
  slug?: string
  taxonomy?: { taxonomy: string; slug: string }
}

export interface ThemeTemplateDefinition {
  id: string
  themeSlug: string
  area: ThemeTemplateArea
  name: string
  conditions: ThemeTemplateConditions
  priority: number
  enabled: boolean
  version: number
  document: BuilderDocument
}

export type ThemeTemplateDraft = Omit<ThemeTemplateDefinition, 'version'>

export interface ThemeTemplateResolutionContext {
  themeSlug: string
  area: ThemeTemplateArea
  context?: ThemeTemplateContext
  postType?: string
  slug?: string
  taxonomies?: Array<{ taxonomy: string; slug: string }>
}

type TemplateDocumentResult =
  | { valid: true; document: BuilderDocument }
  | { valid: false; reason: string }

export type ThemeTemplateDraftResult =
  | { valid: true; draft: ThemeTemplateDraft }
  | { valid: false; reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function matchesConditions(
  conditions: ThemeTemplateConditions,
  context: ThemeTemplateResolutionContext,
): boolean {
  if (conditions.context && conditions.context !== context.context) return false
  if (conditions.postType && conditions.postType !== context.postType) return false
  if (conditions.slug && conditions.slug !== context.slug) return false
  if (conditions.taxonomy) {
    const match = context.taxonomies?.some((taxonomy) =>
      taxonomy.taxonomy === conditions.taxonomy?.taxonomy && taxonomy.slug === conditions.taxonomy?.slug,
    )
    if (!match) return false
  }
  return true
}

function specificity(template: ThemeTemplateDefinition): number {
  const conditions = template.conditions
  return (conditions.slug ? 1000 : 0)
    + (conditions.taxonomy ? 800 : 0)
    + (conditions.postType ? 600 : 0)
    + (conditions.context ? 400 : 0)
}

export function resolveThemeTemplate(
  templates: readonly ThemeTemplateDefinition[],
  context: ThemeTemplateResolutionContext,
): ThemeTemplateDefinition | null {
  return templates
    .filter((template) => template.enabled && template.themeSlug === context.themeSlug && template.area === context.area)
    .filter((template) => matchesConditions(template.conditions, context))
    .sort((left, right) => specificity(right) - specificity(left) || right.priority - left.priority || left.id.localeCompare(right.id))[0] ?? null
}

export function parseThemeTemplateDocument(
  input: unknown,
  componentIds: ReadonlySet<string>,
): TemplateDocumentResult {
  const parsed = parseBuilderDocument(input)
  if (parsed.kind !== 'puck') return { valid: false, reason: 'template document must be a Puck document' }

  const components = validateBuilderComponents(parsed.document, componentIds)
  if (!components.valid) {
    return { valid: false, reason: `template contains unavailable components: ${components.unknownTypes.join(', ')}` }
  }
  if (!validateBuilderLayoutDocument(parsed.document).valid) {
    return { valid: false, reason: 'template contains invalid layout props' }
  }
  return { valid: true, document: parsed.document }
}

export function parseThemeTemplateDraft(input: unknown, componentIds: ReadonlySet<string>): ThemeTemplateDraftResult {
  if (!isRecord(input)) return { valid: false, reason: 'template payload must be an object' }
  if (typeof input.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(input.id)) return { valid: false, reason: 'template id is invalid' }
  if (typeof input.themeSlug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(input.themeSlug)) return { valid: false, reason: 'template theme is invalid' }
  if (!THEME_TEMPLATE_AREAS.includes(input.area as ThemeTemplateArea)) return { valid: false, reason: 'template area is invalid' }
  if (typeof input.name !== 'string' || input.name.trim().length === 0 || input.name.length > 120) return { valid: false, reason: 'template name is invalid' }
  if (input.priority !== undefined && (typeof input.priority !== 'number' || !Number.isInteger(input.priority) || input.priority < -1000 || input.priority > 1000)) return { valid: false, reason: 'template priority is invalid' }
  if (typeof input.enabled !== 'boolean') return { valid: false, reason: 'template enabled flag is invalid' }

  const conditions = input.conditions === undefined ? {} : input.conditions
  if (!isRecord(conditions)) return { valid: false, reason: 'template conditions are invalid' }
  const allowedConditionKeys = ['context', 'postType', 'slug', 'taxonomy']
  if (Object.keys(conditions).some((key) => !allowedConditionKeys.includes(key))) return { valid: false, reason: 'template conditions contain unknown keys' }
  if (conditions.context !== undefined && !['home', 'post', 'page', 'archive', '404'].includes(String(conditions.context))) return { valid: false, reason: 'template context is invalid' }
  for (const key of ['postType', 'slug']) {
    if (conditions[key] !== undefined && (typeof conditions[key] !== 'string' || conditions[key].length > 200)) return { valid: false, reason: `template ${key} condition is invalid` }
  }
  if (conditions.taxonomy !== undefined) {
    if (!isRecord(conditions.taxonomy) || typeof conditions.taxonomy.taxonomy !== 'string' || typeof conditions.taxonomy.slug !== 'string') return { valid: false, reason: 'template taxonomy condition is invalid' }
  }

  const document = parseThemeTemplateDocument(input.document, componentIds)
  if (!document.valid) return document
  return {
    valid: true,
    draft: {
      id: input.id,
      themeSlug: input.themeSlug,
      area: input.area as ThemeTemplateArea,
      name: input.name.trim(),
      conditions: conditions as ThemeTemplateConditions,
      priority: input.priority ?? 0,
      enabled: input.enabled,
      document: document.document,
    },
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function replaceThemeSlots(
  document: BuilderDocument,
  slots: Record<string, unknown[]>,
): BuilderDocument {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        const result = visit(item)
        return Array.isArray(result) ? result : [result]
      })
    }
    if (!isRecord(value)) return value

    if (value.type === 'ThemeSlot' && isRecord(value.props) && typeof value.props.slot === 'string') {
      return clone(slots[value.props.slot] ?? (Array.isArray(value.props.content) ? value.props.content : []))
    }

    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
  }

  return visit(clone(document)) as BuilderDocument
}
