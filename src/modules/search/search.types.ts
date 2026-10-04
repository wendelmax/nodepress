export type SearchDocumentKind = 'post' | 'content' | 'taxonomy' | 'content_type'

export type SearchSort = 'relevance' | 'date_desc' | 'date_asc' | 'title_asc'

export interface SearchQuery {
  query: string
  page: number
  pageSize: number
  sort: SearchSort
  types: string[]
  statuses: string[]
  authorId?: number
  categories: string[]
  tags: string[]
  tenantId?: string
  highlight: boolean
}

export interface SearchDocument {
  sourceKey: string
  kind: SearchDocumentKind
  type: string
  id: string
  tenantId?: string
  title: string
  slug: string
  body: string
  excerpt: string
  url: string
  status: string
  authorId?: number
  categories: string[]
  tags: string[]
  publishedAt?: Date
}

export interface SearchHighlight {
  field: 'title' | 'excerpt' | 'body'
  fragments: string[]
}

export interface SearchResult {
  kind: SearchDocumentKind
  type: string
  id: string
  title: string
  slug: string
  url: string
  excerpt: string
  score: number
  highlights: SearchHighlight[]
  publishedAt?: string
}

export interface SearchPage {
  items: SearchResult[]
  total: number
  totalPages: number
  page: number
  pageSize: number
  query: string
  adapter: string
}

export type SearchHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface SearchHealth {
  adapter: string
  status: SearchHealthStatus
  checkedAt: string
  details?: Record<string, unknown>
}

export interface SearchReindexInput {
  tenantId?: string
}

export interface SearchReindexResult {
  adapter: string
  tenantId?: string
  scanned: number
  indexed: number
  removed: number
  duplicates: number
  completedAt: string
}

export interface SearchAdapter {
  readonly id: string
  search(query: SearchQuery): Promise<SearchPage>
  health(): Promise<SearchHealth>
  reindex(input?: SearchReindexInput): Promise<SearchReindexResult>
}

export interface SearchConfiguration {
  adapter: string
  enabled: boolean
  pageSize: number
  maxPageSize: number
}
