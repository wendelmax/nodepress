import { describe, expect, it } from 'vitest'
import type { ContentRecord, ContentRepository } from '@/modules/content'
import { LandingPageService, type LandingPageRevision, type LandingPageRevisionStore } from '../service'

class MemoryRepository implements ContentRepository {
  records = new Map<string, ContentRecord>()

  async create(input: Omit<ContentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentRecord> {
    const now = new Date()
    const record = { ...input, id: `landing-${this.records.size + 1}`, createdAt: now, updatedAt: now }
    this.records.set(record.id, record)
    return record
  }

  async updateStatus(id: string, status: ContentRecord['status']): Promise<ContentRecord> {
    const record = this.require(id)
    const next = { ...record, status, updatedAt: new Date() }
    this.records.set(id, next)
    return next
  }

  async findBySlug(contentType: string, slug: string, tenantId?: string): Promise<ContentRecord | undefined> {
    return [...this.records.values()].find((record) => record.contentType === contentType && record.slug === slug && record.tenantId === tenantId)
  }

  async findById(id: string): Promise<ContentRecord | undefined> {
    return this.records.get(id)
  }

  async list(contentType: string, tenantId?: string): Promise<ContentRecord[]> {
    return [...this.records.values()].filter((record) => record.contentType === contentType && record.tenantId === tenantId)
  }

  async update(id: string, input: Partial<Pick<ContentRecord, 'title' | 'slug' | 'data'>>): Promise<ContentRecord> {
    const record = this.require(id)
    const next = { ...record, ...input, updatedAt: new Date() }
    this.records.set(id, next)
    return next
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id)
  }

  private require(id: string): ContentRecord {
    const record = this.records.get(id)
    if (!record) throw new Error('Landing page not found')
    return record
  }
}

class MemoryRevisionStore implements LandingPageRevisionStore {
  values = new Map<string, LandingPageRevision[]>()

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined
  }

  async set(key: string, value: unknown): Promise<void> {
    this.values.set(key, value as LandingPageRevision[])
  }
}

function makeService() {
  return new LandingPageService({
    repository: new MemoryRepository(),
    revisions: new MemoryRevisionStore(),
    previewSecret: 'test-secret',
    now: () => new Date('2026-09-27T12:00:00.000Z'),
  })
}

describe('LandingPageService', () => {
  it('creates a draft, publishes it idempotently and resolves it after its schedule', async () => {
    const service = makeService()
    const page = await service.create({
      title: 'Campanha',
      slug: 'campanha',
      document: { content: [], root: {} },
      publishAt: '2026-09-27T13:00:00.000Z',
      timezone: 'America/Sao_Paulo',
    })

    expect(await service.findPublicBySlug('campanha')).toBeUndefined()
    const published = await service.publish(page.id)
    expect((await service.publish(page.id)).status).toBe('publish')
    expect(published.status).toBe('publish')
    expect(await service.findPublicBySlug('campanha')).toBeUndefined()

    await service.update(page.id, { publishAt: '2026-09-27T11:00:00.000Z' })
    expect((await service.findPublicBySlug('campanha'))?.id).toBe(page.id)
  })

  it('keeps an immutable revision and rolls back the document', async () => {
    const service = makeService()
    const page = await service.create({ title: 'Campanha', document: { content: ['v1'], root: {} } })
    await service.update(page.id, { document: { content: ['v2'], root: {} } })

    const revisions = await service.listRevisions(page.id)
    expect(revisions).toHaveLength(1)
    await service.rollback(page.id, revisions[0].id)

    expect((await service.findPreviewById(page.id, service.createPreviewToken(page.id).token))?.data.document)
      .toEqual({ content: ['v1'], root: {} })
  })

  it('only exposes drafts through a valid preview token for the same page', async () => {
    const service = makeService()
    const page = await service.create({ title: 'Privada', document: { content: [], root: {} } })
    const preview = service.createPreviewToken(page.id)

    expect(await service.findPreviewById(page.id, 'invalid')).toBeUndefined()
    expect((await service.findPreviewById(page.id, preview.token))?.id).toBe(page.id)
    expect(await service.findPreviewById('other-page', preview.token)).toBeUndefined()
  })

  it('keeps private landing pages out of the public resolver while allowing preview', async () => {
    const service = makeService()
    const page = await service.create({
      title: 'Privada',
      status: 'private',
      document: { content: [], root: {} },
    })
    const preview = service.createPreviewToken(page.id)

    expect(await service.findPublicBySlug(page.slug)).toBeUndefined()
    expect((await service.findPreviewById(page.id, preview.token))?.status).toBe('private')
  })
})
