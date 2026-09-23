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
  findById(id: string): Promise<ContentRecord | undefined>
  list(contentType: string, tenantId?: string): Promise<ContentRecord[]>
  update(id: string, input: Partial<Pick<ContentRecord, 'title' | 'slug' | 'data'>>): Promise<ContentRecord>
  delete(id: string): Promise<void>
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
    const normalized = await this.validate(input, context)

    const existing = await this.repository.findBySlug(input.contentType, normalized.slug, context?.tenantId)
    if (existing) throw new Error(`Content slug already exists: ${input.contentType}/${normalized.slug}`)

    return this.repository.create({
      contentType: input.contentType,
      tenantId: context?.tenantId,
      title: normalized.title,
      slug: normalized.slug,
      status: input.status ?? 'draft',
      data: { ...input.data },
    })
  }

  async validate(input: CreateContentInput, context?: Pick<NodePressContext, 'tenantId'>): Promise<{ title: string; slug: string }> {
    const definition = this.registry.get(input.contentType)
    if (!definition) throw new Error(`Unknown content type: ${input.contentType}`)
    if (!input.title.trim()) throw new Error('Content title is required')
    const slug = normalizeSlug(input.slug || input.title)
    if (!slug) throw new Error('Content slug is required')
    validateContentData(definition.fields, input.data, input.contentType)
    const existing = await this.repository.findBySlug(input.contentType, slug, context?.tenantId)
    if (existing) throw new Error(`Content slug already exists: ${input.contentType}/${slug}`)
    return { title: input.title.trim(), slug }
  }

  publish(id: string): Promise<ContentRecord> {
    return this.repository.updateStatus(id, 'publish')
  }

  async list(contentType: string, context?: Pick<NodePressContext, 'tenantId'>): Promise<ContentRecord[]> {
    if (!this.registry.get(contentType)) throw new Error(`Unknown content type: ${contentType}`)
    return this.repository.list(contentType, context?.tenantId)
  }

  async update(
    id: string,
    input: Partial<Pick<ContentRecord, 'title' | 'slug' | 'data'>>,
    context?: Pick<NodePressContext, 'tenantId'>,
  ): Promise<ContentRecord> {
    const current = await this.repository.findById(id)
    if (!current || current.tenantId !== context?.tenantId) throw new Error('Content record not found')
    const definition = this.registry.get(current.contentType)
    if (!definition) throw new Error(`Unknown content type: ${current.contentType}`)

    const nextTitle = input.title === undefined ? current.title : input.title.trim()
    if (!nextTitle) throw new Error('Content title is required')
    const nextSlug = input.slug === undefined ? current.slug : normalizeSlug(input.slug)
    if (!nextSlug) throw new Error('Content slug is required')
    const nextData = input.data === undefined ? current.data : input.data
    validateContentData(definition.fields, nextData, current.contentType)

    const existing = await this.repository.findBySlug(current.contentType, nextSlug, context?.tenantId)
    if (existing && existing.id !== id) throw new Error(`Content slug already exists: ${current.contentType}/${nextSlug}`)

    return this.repository.update(id, { title: nextTitle, slug: nextSlug, data: { ...nextData } })
  }

  async remove(id: string, context?: Pick<NodePressContext, 'tenantId'>): Promise<void> {
    const current = await this.repository.findById(id)
    if (!current || current.tenantId !== context?.tenantId) throw new Error('Content record not found')
    await this.repository.delete(id)
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
