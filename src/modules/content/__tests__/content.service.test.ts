import { beforeEach, describe, expect, it } from 'vitest'
import { ContentService, type ContentRecord, type ContentRepository } from '../content.service'
import {
  ContentTypeRegistry,
  type ContentTypeDefinition,
} from '../content-type-registry'

describe('generic content types', () => {
  let registry: ContentTypeRegistry
  let repository: MemoryContentRepository
  let service: ContentService

  beforeEach(() => {
    registry = new ContentTypeRegistry()
    repository = new MemoryContentRepository()
    service = new ContentService(registry, repository)
  })

  it('registers immutable definitions and rejects duplicate or invalid types', () => {
    const definition = animalDefinition()
    registry.register(definition)

    expect(registry.get('animal')).toEqual(definition)
    expect(Object.isFrozen(registry.get('animal'))).toBe(true)
    expect(() => registry.register(definition)).toThrow(/already registered/i)
    expect(() => registry.register({ ...definition, id: 'Invalid ID' })).toThrow(/content type id/i)
  })

  it('validates fields, creates draft records, and preserves tenant context', async () => {
    registry.register(animalDefinition())

    const record = await service.create({
      contentType: 'animal',
      title: 'Rex',
      slug: 'rex',
      data: { name: 'Rex', status: 'available', weight: 12.5 },
    }, { tenantId: 'site-1' })

    expect(record).toMatchObject({
      contentType: 'animal',
      slug: 'rex',
      status: 'draft',
      tenantId: 'site-1',
    })
    await expect(service.create({
      contentType: 'animal', title: 'Missing', slug: 'missing', data: { status: 'available' },
    })).rejects.toThrow(/required/i)
    await expect(service.create({
      contentType: 'animal', title: 'Invalid', slug: 'invalid', data: { name: 'X', status: 'unknown' },
    })).rejects.toThrow(/option/i)
  })

  it('publishes records and prevents duplicate slugs within a content type', async () => {
    registry.register(animalDefinition())
    const record = await service.create({
      contentType: 'animal', title: 'Rex', slug: 'rex', data: { name: 'Rex', status: 'available' },
    })

    const published = await service.publish(record.id)
    expect(published.status).toBe('publish')
    await expect(service.create({
      contentType: 'animal', title: 'Another Rex', slug: 'rex', data: { name: 'Other', status: 'available' },
    })).rejects.toThrow(/slug/i)
  })
})

function animalDefinition(): ContentTypeDefinition {
  return {
    id: 'animal',
    label: 'Animal',
    version: '1.0.0',
    fields: {
      name: { type: 'text', required: true },
      status: { type: 'select', required: true, options: ['available', 'adopted'] },
      weight: { type: 'number' },
    },
  }
}

class MemoryContentRepository implements ContentRepository {
  private records: ContentRecord[] = []
  private nextId = 1

  async create(input: Omit<ContentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentRecord> {
    if (this.records.some((record) => record.contentType === input.contentType && record.slug === input.slug && record.tenantId === input.tenantId)) {
      throw new Error('Content slug already exists')
    }
    const now = new Date()
    const record = { ...input, id: String(this.nextId++), createdAt: now, updatedAt: now }
    this.records.push(record)
    return record
  }

  async updateStatus(id: string, status: ContentRecord['status']): Promise<ContentRecord> {
    const record = this.records.find((item) => item.id === id)
    if (!record) throw new Error('Content record not found')
    record.status = status
    record.updatedAt = new Date()
    return record
  }

  async findBySlug(contentType: string, slug: string, tenantId?: string): Promise<ContentRecord | undefined> {
    return this.records.find((record) => record.contentType === contentType && record.slug === slug && record.tenantId === tenantId)
  }
}
