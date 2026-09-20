import type { NodePressContext } from '@/core/context'
import type { ContentFieldDefinition, ContentTypeRegistry } from './content-type-registry'

export type ContentStatus = 'draft' | 'publish' | 'archived'

export interface ContentRecord {
  id: string
  contentType: string
  tenantId?: string
  title: string
  slug: string
  status: ContentStatus
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ContentRepository {
  create(input: Omit<ContentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentRecord>
  updateStatus(id: string, status: ContentStatus): Promise<ContentRecord>
  findBySlug(contentType: string, slug: string, tenantId?: string): Promise<ContentRecord | undefined>
}

export interface CreateContentInput {
  contentType: string
  title: string
  slug?: string
  status?: ContentStatus
  data: Record<string, unknown>
}

export class ContentService {
  constructor(
    private readonly registry: ContentTypeRegistry,
    private readonly repository: ContentRepository,
  ) {}

  async create(input: CreateContentInput, context?: Pick<NodePressContext, 'tenantId'>): Promise<ContentRecord> {
    const definition = this.registry.get(input.contentType)
    if (!definition) throw new Error(`Unknown content type: ${input.contentType}`)
    if (!input.title.trim()) throw new Error('Content title is required')
    const slug = normalizeSlug(input.slug || input.title)
    if (!slug) throw new Error('Content slug is required')
    validateContentData(definition.fields, input.data, input.contentType)

    const existing = await this.repository.findBySlug(input.contentType, slug, context?.tenantId)
    if (existing) throw new Error(`Content slug already exists: ${input.contentType}/${slug}`)

    return this.repository.create({
      contentType: input.contentType,
      tenantId: context?.tenantId,
      title: input.title.trim(),
      slug,
      status: input.status ?? 'draft',
      data: { ...input.data },
    })
  }

  publish(id: string): Promise<ContentRecord> {
    return this.repository.updateStatus(id, 'publish')
  }
}

function validateContentData(
  fields: Record<string, ContentFieldDefinition>,
  data: Record<string, unknown>,
  contentType: string,
): void {
  for (const [fieldId, definition] of Object.entries(fields)) {
    const value = data[fieldId]
    if (definition.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Required content field: ${contentType}.${fieldId}`)
    }
    if (value === undefined || value === null) continue
    if (definition.type === 'select' && (!definition.options || !definition.options.includes(value as string))) {
      throw new Error(`Invalid option for content field: ${contentType}.${fieldId}`)
    }
    if (!matchesFieldType(definition, value)) {
      throw new Error(`Invalid value for content field: ${contentType}.${fieldId}`)
    }
  }
  for (const fieldId of Object.keys(data)) {
    if (!fields[fieldId]) throw new Error(`Unknown content field: ${contentType}.${fieldId}`)
  }
}

function matchesFieldType(definition: ContentFieldDefinition, value: unknown): boolean {
  if (definition.multiple && !Array.isArray(value)) return false
  const values = definition.multiple ? value as unknown[] : [value]
  return values.every((item) => {
    switch (definition.type) {
      case 'text': return typeof item === 'string'
      case 'number': return typeof item === 'number' && Number.isFinite(item)
      case 'boolean': return typeof item === 'boolean'
      case 'date': return typeof item === 'string' && !Number.isNaN(Date.parse(item))
      case 'select': return typeof item === 'string' && definition.options?.includes(item)
      case 'relation':
      case 'media': return typeof item === 'string' || typeof item === 'number'
      case 'json': return true
    }
  })
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
