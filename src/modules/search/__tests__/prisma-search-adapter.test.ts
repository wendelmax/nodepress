import { beforeEach, describe, expect, it } from 'vitest'
import { PrismaSearchAdapter, type SearchIndexStore, type SearchSource } from '../prisma-search-adapter'
import { normalizeSearchQuery } from '../search.utils'
import type { SearchDocument } from '../search.types'

describe('PrismaSearchAdapter contract', () => {
  let source: MemorySearchSource
  let store: MemorySearchIndexStore
  let adapter: PrismaSearchAdapter

  beforeEach(() => {
    source = new MemorySearchSource([
      document({ sourceKey: 'post:1', id: '1', title: 'Adoção de cães', categories: ['adoção'], tags: ['cães'], authorId: 7, tenantId: undefined }),
      document({ sourceKey: 'post:2', id: '2', title: 'Adoção de gatos', categories: ['adoção'], tags: ['gatos'], authorId: 8, tenantId: undefined, publishedAt: new Date('2025-12-31T00:00:00.000Z') }),
      document({ sourceKey: 'content:tenant-a:1', kind: 'content', type: 'animal', id: '1', title: 'Rex disponível', tenantId: 'tenant-a', categories: [], tags: [] }),
      document({ sourceKey: 'content:tenant-b:1', kind: 'content', type: 'animal', id: '2', title: 'Rex reservado', tenantId: 'tenant-b', categories: [], tags: [] }),
      document({ sourceKey: 'post:draft', id: 'draft', title: 'Adoção em rascunho', status: 'draft', categories: [], tags: [] }),
    ])
    store = new MemorySearchIndexStore()
    adapter = new PrismaSearchAdapter(source, store)
  })

  it('returns only published matching documents with filters and relevance', async () => {
    const query = normalizeSearchQuery({
      query: 'adoção',
      authorId: 7,
      categories: ['adoção'],
      pageSize: 10,
    })

    const result = await adapter.search(query)

    expect(result.total).toBe(1)
    expect(result.items[0]).toMatchObject({ id: '1', title: 'Adoção de cães', type: 'post' })
    expect(result.items[0].score).toBeGreaterThan(0)
    expect(result.items[0]).not.toHaveProperty('body')
  })

  it('isolates generic content by tenant while keeping legacy posts global', async () => {
    await adapter.reindex({ tenantId: 'tenant-a' })

    const result = await adapter.search(normalizeSearchQuery({ query: 'rex', tenantId: 'tenant-a' }))

    expect(result.items.map((item) => item.id)).toEqual(['1'])
    expect(source.requestedTenants).toContain('tenant-a')
  })

  it('reindexes by unique source key without duplicating repeated input', async () => {
    source.documents.push({ ...source.documents[0], title: 'Duplicado da mesma origem' })

    const first = await adapter.reindex()
    const second = await adapter.reindex()

    expect(first.duplicates).toBe(1)
    expect(first.indexed).toBe(4)
    expect(second.duplicates).toBe(1)
    expect(await store.size()).toBe(4)
  })

  it('reports a healthy local adapter and supports date ordering', async () => {
    await adapter.reindex()
    const result = await adapter.search(normalizeSearchQuery({ query: 'adoção', sort: 'date_asc' }))
    const health = await adapter.health()

    expect(result.items.map((item) => item.id)).toEqual(['2', '1'])
    expect(health).toMatchObject({ adapter: 'local-postgres', status: 'healthy' })
  })

  it('refreshes the projection before public reads so unpublished changes are not leaked', async () => {
    await adapter.reindex()
    source.documents = source.documents.map((item) => item.sourceKey === 'post:1' ? { ...item, status: 'draft' } : item)

    const result = await adapter.search(normalizeSearchQuery({ query: 'adoção de cães' }))

    expect(result.items.map((item) => item.id)).not.toContain('1')
  })
})

function document(overrides: Partial<SearchDocument>): SearchDocument {
  return {
    sourceKey: 'post:default',
    kind: 'post',
    type: 'post',
    id: 'default',
    title: 'Documento',
    slug: 'documento',
    body: 'Conteúdo publicado.',
    excerpt: 'Resumo publicado.',
    url: '/documento',
    status: 'publish',
    categories: [],
    tags: [],
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

class MemorySearchSource implements SearchSource {
  requestedTenants: Array<string | undefined> = []

  constructor(public documents: SearchDocument[]) {}

  async listPublished(tenantId?: string): Promise<SearchDocument[]> {
    this.requestedTenants.push(tenantId)
    return this.documents.filter((document) => !tenantId || document.tenantId === tenantId || document.kind === 'post')
  }

  async health() {
    return { status: 'healthy' as const, details: { source: 'memory' } }
  }
}

class MemorySearchIndexStore implements SearchIndexStore {
  private documents = new Map<string, SearchDocument>()

  async replace(documents: SearchDocument[], tenantId?: string) {
    for (const [key, existing] of this.documents) {
      if (!tenantId || existing.tenantId === tenantId || existing.kind === 'post') this.documents.delete(key)
    }
    for (const document of documents) this.documents.set(document.sourceKey, document)
    return { removed: 0, duplicates: 0 }
  }

  async list(tenantId?: string) {
    return [...this.documents.values()].filter((document) => !tenantId || document.tenantId === tenantId || document.kind === 'post')
  }

  async health() {
    return { status: 'healthy' as const, details: { store: 'memory' } }
  }

  async size() {
    return this.documents.size
  }
}
