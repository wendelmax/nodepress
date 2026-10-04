import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { contentTypeRegistry } from '@/modules/content'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { buildSearchPage } from './search.utils'
import type {
  SearchAdapter,
  SearchDocument,
  SearchHealth,
  SearchQuery,
  SearchReindexInput,
  SearchReindexResult,
} from './search.types'

export interface SearchSource {
  listPublished(tenantId?: string): Promise<SearchDocument[]>
  health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: Record<string, unknown> }>
}

export interface SearchIndexStore {
  replace(documents: SearchDocument[], tenantId?: string): Promise<{ removed: number; duplicates: number }>
  list(tenantId?: string): Promise<SearchDocument[]>
  health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: Record<string, unknown> }>
}

export class PrismaSearchAdapter implements SearchAdapter {
  readonly id = 'local-postgres'

  constructor(
    private readonly source: SearchSource = new PrismaSearchSource(),
    private readonly store: SearchIndexStore = new PrismaSearchIndexStore(),
  ) {}

  async search(query: SearchQuery) {
    await this.reindex({ tenantId: query.tenantId })
    const documents = await this.store.list(query.tenantId)
    return buildSearchPage(
      documents.filter((document) => document.status === 'publish' && (!query.tenantId || document.tenantId === query.tenantId || document.kind !== 'content')),
      query,
      this.id,
    )
  }

  async health(): Promise<SearchHealth> {
    const [source, store] = await Promise.all([this.source.health(), this.store.health()])
    const status = source.status === 'unhealthy' || store.status === 'unhealthy'
      ? 'unhealthy'
      : source.status === 'degraded' || store.status === 'degraded'
        ? 'degraded'
        : 'healthy'
    return {
      adapter: this.id,
      status,
      checkedAt: new Date().toISOString(),
      details: { source: source.details, store: store.details },
    }
  }

  async reindex(input: SearchReindexInput = {}): Promise<SearchReindexResult> {
    const sourceDocuments = await this.source.listPublished(input.tenantId)
    const unique = new Map<string, SearchDocument>()
    let duplicates = 0

    for (const document of sourceDocuments) {
      if (document.status !== 'publish') continue
      if (input.tenantId && document.kind === 'content' && document.tenantId !== input.tenantId) continue
      if (unique.has(document.sourceKey)) duplicates += 1
      else unique.set(document.sourceKey, document)
    }

    const storeResult = await this.store.replace([...unique.values()], input.tenantId)
    return {
      adapter: this.id,
      tenantId: input.tenantId,
      scanned: sourceDocuments.length,
      indexed: unique.size,
      removed: storeResult.removed,
      duplicates: duplicates + storeResult.duplicates,
      completedAt: new Date().toISOString(),
    }
  }
}

export class PrismaSearchSource implements SearchSource {
  async listPublished(tenantId?: string): Promise<SearchDocument[]> {
    await ensureActivePluginsLoaded()
    const [posts, contentRecords, taxonomies] = await Promise.all([
      prisma.post.findMany({
        where: { postStatus: 'publish', postType: { in: ['post', 'page'] } },
        select: {
          id: true,
          postTitle: true,
          postName: true,
          postContent: true,
          postExcerpt: true,
          postType: true,
          postStatus: true,
          postAuthor: true,
          postDate: true,
        },
      }),
      prisma.contentRecord.findMany({
        where: { status: 'publish', ...(tenantId ? { tenantId } : {}) },
      }),
      prisma.termTaxonomy.findMany({
        where: { taxonomy: { in: ['category', 'post_tag', 'tag'] } },
        include: { term: true },
      }),
    ])

    const postIds = posts.map((post) => post.id)
    const relationships = postIds.length === 0
      ? []
      : await prisma.termRelationship.findMany({
        where: { objectId: { in: postIds } },
        include: { termTaxonomy: { include: { term: true } } },
      })
    const termsByPost = new Map<number, { categories: string[]; tags: string[] }>()

    for (const relationship of relationships) {
      const current = termsByPost.get(relationship.objectId) ?? { categories: [], tags: [] }
      const taxonomy = relationship.termTaxonomy.taxonomy
      const value = relationship.termTaxonomy.term.slug || relationship.termTaxonomy.term.name
      if (taxonomy === 'category') current.categories.push(value)
      if (taxonomy === 'post_tag' || taxonomy === 'tag') current.tags.push(value)
      termsByPost.set(relationship.objectId, current)
    }

    const postDocuments = posts.map((post) => {
      const terms = termsByPost.get(post.id) ?? { categories: [], tags: [] }
      return {
        sourceKey: `post:${post.id}`,
        kind: 'post' as const,
        type: post.postType,
        id: String(post.id),
        title: post.postTitle,
        slug: post.postName,
        body: post.postContent,
        excerpt: post.postExcerpt || stripMarkup(post.postContent).slice(0, 240),
        url: `/${post.postName}`,
        status: post.postStatus,
        authorId: post.postAuthor,
        categories: terms.categories,
        tags: terms.tags,
        publishedAt: post.postDate,
      }
    })

    const contentDocuments = contentRecords.map((record) => ({
      sourceKey: `content:${record.tenantId ?? 'global'}:${record.id}`,
      kind: 'content' as const,
      type: record.contentType,
      id: record.id,
      tenantId: record.tenantId ?? undefined,
      title: record.title,
      slug: record.slug,
      body: JSON.stringify(record.data),
      excerpt: JSON.stringify(record.data).slice(0, 240),
      url: `/content/${record.contentType}/${record.slug}`,
      status: record.status,
      categories: [],
      tags: [],
      publishedAt: record.updatedAt,
    }))

    const taxonomyDocuments = taxonomies.map((taxonomy) => ({
      sourceKey: `taxonomy:${taxonomy.taxonomy}:${taxonomy.term.slug}`,
      kind: 'taxonomy' as const,
      type: taxonomy.taxonomy === 'category' ? 'category' : 'tag',
      id: String(taxonomy.termId),
      title: taxonomy.term.name,
      slug: taxonomy.term.slug,
      body: taxonomy.description,
      excerpt: taxonomy.description.slice(0, 240),
      url: `/${taxonomy.taxonomy === 'category' ? 'category' : 'tag'}/${taxonomy.term.slug}`,
      status: 'publish',
      categories: [],
      tags: [],
      publishedAt: undefined,
    }))

    const contentTypeDocuments = [
      { id: 'post', label: 'Posts' },
      { id: 'page', label: 'Pages' },
      ...contentTypeRegistry.list().map((definition) => ({ id: definition.id, label: definition.label })),
    ].filter((type, index, all) => all.findIndex((candidate) => candidate.id === type.id) === index)
      .map((type) => ({
        sourceKey: `content_type:${type.id}`,
        kind: 'content_type' as const,
        type: 'content_type',
        id: type.id,
        title: type.label,
        slug: type.id,
        body: type.label,
        excerpt: type.label,
        url: `/content-types/${type.id}`,
        status: 'publish',
        categories: [],
        tags: [],
        publishedAt: undefined,
      }))

    return [...postDocuments, ...contentDocuments, ...taxonomyDocuments, ...contentTypeDocuments]
  }

  async health() {
    try {
      await prisma.post.count()
      return { status: 'healthy' as const, details: { source: 'prisma' } }
    } catch {
      return { status: 'unhealthy' as const, details: { reason: 'database_unavailable' } }
    }
  }
}

export class PrismaSearchIndexStore implements SearchIndexStore {
  async replace(documents: SearchDocument[], tenantId?: string) {
    const removed = await prisma.$transaction(async (transaction) => {
      const deleted = await transaction.searchDocument.deleteMany({
        where: tenantId
          ? { OR: [{ tenantId }, { tenantId: null }] }
          : {},
      })
      if (documents.length > 0) {
        await transaction.searchDocument.createMany({
          data: documents.map((document) => ({
            sourceKey: document.sourceKey,
            kind: document.kind,
            type: document.type,
            sourceId: document.id,
            tenantId: document.tenantId,
            title: document.title,
            slug: document.slug,
            body: document.body,
            excerpt: document.excerpt,
            url: document.url,
            status: document.status,
            authorId: document.authorId,
            categories: document.categories as Prisma.InputJsonValue,
            tags: document.tags as Prisma.InputJsonValue,
            publishedAt: document.publishedAt,
          })),
        })
      }
      return deleted.count
    })
    return { removed, duplicates: 0 }
  }

  async list(tenantId?: string): Promise<SearchDocument[]> {
    const rows = await prisma.searchDocument.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
    })
    return rows.map((row) => ({
      sourceKey: row.sourceKey,
      kind: row.kind as SearchDocument['kind'],
      type: row.type,
      id: row.sourceId,
      tenantId: row.tenantId ?? undefined,
      title: row.title,
      slug: row.slug,
      body: row.body,
      excerpt: row.excerpt,
      url: row.url,
      status: row.status,
      authorId: row.authorId ?? undefined,
      categories: readStringArray(row.categories),
      tags: readStringArray(row.tags),
      publishedAt: row.publishedAt ?? undefined,
    }))
  }

  async health() {
    try {
      const count = await prisma.searchDocument.count()
      return { status: 'healthy' as const, details: { store: 'prisma', documents: count } }
    } catch {
      return { status: 'unhealthy' as const, details: { reason: 'search_index_unavailable' } }
    }
  }
}

function readStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
