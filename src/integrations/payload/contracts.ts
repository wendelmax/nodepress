import type { ContentRecord, ContentStatus, CreateContentInput } from '@/modules/content/content.service'

export interface PayloadExport {
  version: 1
  source?: string
  collections: PayloadCollection[]
}

export interface PayloadCollection {
  name: string
  records: PayloadRecord[]
}

export interface PayloadRecord {
  id: string
  data: Record<string, unknown>
  previousSlugs?: string[]
}

export interface PayloadSource {
  read(): Promise<PayloadExport>
}

export interface PayloadImportMapping {
  collection: string
  contentType: string
  titleField: string
  slugField?: string
  statusField?: string
  fields: Record<string, string>
  relations?: Record<string, PayloadRelationMapping>
  media?: Record<string, PayloadMediaMapping>
}

export interface PayloadRelationMapping {
  collection: string
  sourceField: string
  multiple?: boolean
}

export interface PayloadMediaMapping {
  sourceField: string
  contentType?: string
}

export interface PayloadContentWriter {
  validate(input: CreateContentInput): Promise<void>
  create(input: CreateContentInput): Promise<ContentRecord>
  update(id: string, data: Record<string, unknown>): Promise<ContentRecord>
}

export interface PayloadImportCheckpoint {
  source: string
  collection: string
  sourceId: string
  targetId: string
  targetType: string
  slug: string
  importedAt: string
}

export interface PayloadImportStore {
  get(source: string, collection: string, sourceId: string): Promise<PayloadImportCheckpoint | undefined>
  save(checkpoint: PayloadImportCheckpoint): Promise<void>
}

export interface PayloadMediaPort {
  import(url: string, metadata?: { contentType?: string }): Promise<string>
}

export interface PayloadRedirectPort {
  add(input: { source: string; collection: string; fromSlug: string; toSlug: string; targetId: string }): Promise<void>
}

export interface PayloadImportOptions {
  source?: string
  mappings: PayloadImportMapping[]
  batchSize?: number
  dryRun?: boolean
  resume?: boolean
  media?: PayloadMediaPort
  redirects?: PayloadRedirectPort
}

export interface PayloadImportWarning {
  code: 'unknown_collection' | 'missing_relation' | 'media_failed' | 'redirect_failed'
  collection: string
  sourceId?: string
  message: string
}

export interface PayloadImportError {
  collection: string
  sourceId: string
  message: string
}

export interface PayloadImportReport {
  source: string
  dryRun: boolean
  batches: number
  records: { seen: number; imported: number; skipped: number; failed: number }
  relations: { resolved: number; missing: number }
  warnings: PayloadImportWarning[]
  errors: PayloadImportError[]
}

export type PayloadInputStatus = Extract<ContentStatus, 'draft' | 'publish' | 'archived'>

export interface MappedPayloadContent {
  input: CreateContentInput
  relations: PendingPayloadRelation[]
}

export interface PendingPayloadRelation {
  targetId: string
  targetField: string
  targetCollection: string
  sourceRelationId: string
  multiple: boolean
}
