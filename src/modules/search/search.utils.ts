import type { SearchDocument, SearchPage, SearchQuery, SearchResult, SearchSort } from './search.types'

export const DEFAULT_SEARCH_PAGE_SIZE = 20
export const MAX_SEARCH_PAGE_SIZE = 100

const FIELD_WEIGHTS = [
  ['title', 8],
  ['slug', 5],
  ['excerpt', 4],
  ['body', 2],
  ['categories', 3],
  ['tags', 3],
] as const

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeSearchQuery(input: {
  query?: unknown
  page?: unknown
  pageSize?: unknown
  sort?: unknown
  types?: string[]
  statuses?: string[]
  authorId?: unknown
  categories?: string[]
  tags?: string[]
  tenantId?: string
  highlight?: unknown
}): SearchQuery {
  const query = typeof input.query === 'string' ? input.query.trim() : ''
  if (!query) throw new Error('Search query is required')
  if (query.length > 200) throw new Error('Search query is too long')

  const page = parseInteger(input.page, 1)
  const pageSize = parseInteger(input.pageSize, DEFAULT_SEARCH_PAGE_SIZE)
  if (!Number.isInteger(page) || page < 1) throw new Error('Page must be at least 1')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_SEARCH_PAGE_SIZE) {
    throw new Error(`Page size must be between 1 and ${MAX_SEARCH_PAGE_SIZE}`)
  }

  const sort = input.sort === undefined ? 'relevance' : input.sort
  if (!['relevance', 'date_desc', 'date_asc', 'title_asc'].includes(String(sort))) {
    throw new Error('Invalid search sort')
  }

  const authorId = input.authorId === undefined || input.authorId === ''
    ? undefined
    : parseInteger(input.authorId, Number.NaN)
  if (authorId !== undefined && (!Number.isInteger(authorId) || authorId < 1)) {
    throw new Error('Invalid author filter')
  }

  return {
    query,
    page,
    pageSize,
    sort: sort as SearchSort,
    types: normalizeList(input.types),
    statuses: normalizeList(input.statuses, ['publish']),
    authorId,
    categories: normalizeList(input.categories),
    tags: normalizeList(input.tags),
    tenantId: input.tenantId?.trim() || undefined,
    highlight: input.highlight !== false && input.highlight !== 'false',
  }
}

export function scoreSearchDocument(document: SearchDocument, query: string): number {
  const tokens = tokenize(query)
  if (tokens.length === 0) return 0

  const values: Record<string, string> = {
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt,
    body: document.body,
    categories: document.categories.join(' '),
    tags: document.tags.join(' '),
  }

  let score = 0
  for (const token of tokens) {
    for (const [field, weight] of FIELD_WEIGHTS) {
      const normalized = normalizeSearchText(values[field])
      if (normalized.includes(token)) {
        score += weight
        if (normalized === token || normalized.startsWith(`${token} `)) score += weight
        continue
      }

      const approximateMatch = tokenize(normalized).some((candidate) => {
        const distance = levenshtein(candidate, token)
        return distance <= Math.max(1, Math.floor(token.length * 0.34))
      })
      if (approximateMatch) score += weight * 0.25
    }
  }

  const phrase = normalizeSearchText(query)
  if (phrase && normalizeSearchText(document.title).includes(phrase)) score += 10
  return score
}

export function highlightSearchText(value: string, query: string): string {
  const tokens = tokenize(query)
  if (tokens.length === 0) return escapeHtml(value)
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      const normalized = normalizeSearchText(part)
      const match = tokens.some((token) => normalized.includes(token) || levenshtein(normalized, token) <= Math.max(1, Math.floor(token.length * 0.34)))
      return match ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
    })
    .join('')
}

export function buildSearchPage(documents: SearchDocument[], query: SearchQuery, adapter = 'local-postgres'): SearchPage {
  const filtered = documents
    .filter((document) => query.statuses.length === 0 || query.statuses.includes(document.status))
    .filter((document) => query.types.length === 0 || query.types.includes(document.type))
    .filter((document) => query.authorId === undefined || document.authorId === query.authorId)
    .filter((document) => query.categories.every((category) => document.categories.includes(category)))
    .filter((document) => query.tags.every((tag) => document.tags.includes(tag)))
    .map((document) => ({ document, score: scoreSearchDocument(document, query.query) }))
    .filter(({ score }) => score > 0)

  filtered.sort((left, right) => compareScoredDocuments(left.document, left.score, right.document, right.score, query.sort))

  const total = filtered.length
  const start = (query.page - 1) * query.pageSize
  const items = filtered.slice(start, start + query.pageSize).map(({ document, score }) => toSearchResult(document, score, query))
  return {
    items,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    query: query.query,
    adapter,
  }
}

function compareScoredDocuments(left: SearchDocument, leftScore: number, right: SearchDocument, rightScore: number, sort: SearchSort): number {
  if (sort === 'title_asc') return left.title.localeCompare(right.title) || left.sourceKey.localeCompare(right.sourceKey)
  if (sort === 'date_asc') return dateValue(left.publishedAt) - dateValue(right.publishedAt) || left.sourceKey.localeCompare(right.sourceKey)
  if (sort === 'date_desc') return dateValue(right.publishedAt) - dateValue(left.publishedAt) || left.sourceKey.localeCompare(right.sourceKey)
  return rightScore - leftScore || dateValue(right.publishedAt) - dateValue(left.publishedAt) || left.title.localeCompare(right.title) || left.sourceKey.localeCompare(right.sourceKey)
}

function toSearchResult(document: SearchDocument, score: number, query: SearchQuery): SearchResult {
  const highlights = query.highlight
    ? ([
      ['title', document.title],
      ['excerpt', document.excerpt],
      ['body', document.body],
    ] as const)
      .filter(([, value]) => Boolean(value))
      .map(([field, value]) => ({ field, fragments: [highlightSearchText(value.slice(0, field === 'body' ? 240 : 180), query.query)] }))
    : []

  return {
    kind: document.kind,
    type: document.type,
    id: document.id,
    title: escapeHtml(document.title),
    slug: document.slug,
    url: document.url,
    excerpt: escapeHtml(document.excerpt.slice(0, 240)),
    score: Number(score.toFixed(4)),
    highlights,
    publishedAt: document.publishedAt?.toISOString(),
  }
}

function normalizeList(values: string[] | undefined, fallback: string[] = []): string[] {
  return [...new Set((values ?? fallback).map((value) => value.trim().toLocaleLowerCase()).filter(Boolean))]
}

function parseInteger(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

function dateValue(value: Date | undefined): number {
  return value?.getTime() ?? 0
}

function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j]
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(row[j] + 1, row[j - 1] + 1, diagonal + 1)
      diagonal = previous
    }
  }
  return row[right.length]
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}
