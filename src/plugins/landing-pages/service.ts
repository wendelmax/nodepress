import { randomUUID } from 'node:crypto'
import type { ContentRecord, ContentRepository } from '@/modules/content'
import {
  createPreviewToken as signPreviewToken,
  isLandingPagePublished,
  verifyPreviewToken,
} from './domain'

export const LANDING_PAGE_CONTENT_TYPE = 'landing-page'

export interface LandingPageInput {
  title: string
  slug?: string
  document: Record<string, unknown>
  status?: 'draft' | 'publish' | 'archived'
  publishAt?: string | null
  timezone?: string
  seo?: Record<string, unknown>
}

export type LandingPageUpdate = Partial<LandingPageInput>

export interface LandingPageRevision {
  id: string
  title: string
  slug: string
  status: ContentRecord['status']
  data: Record<string, unknown>
  createdAt: string
}

export interface LandingPageRevisionStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

export interface LandingPageServiceOptions {
  repository: ContentRepository
  revisions: LandingPageRevisionStore
  previewSecret: string
  now?: () => Date
}

export interface PreviewTokenResult {
  token: string
  expiresAt: string
}

export class LandingPageService {
  private readonly now: () => Date

  constructor(private readonly options: LandingPageServiceOptions) {
    this.now = options.now ?? (() => new Date())
  }

  async create(input: LandingPageInput): Promise<ContentRecord> {
    const normalized = normalizeInput(input)
    const existing = await this.options.repository.findBySlug(LANDING_PAGE_CONTENT_TYPE, normalized.slug)
    if (existing) throw new Error(`Landing page slug already exists: ${normalized.slug}`)

    return this.options.repository.create({
      contentType: LANDING_PAGE_CONTENT_TYPE,
      title: normalized.title,
      slug: normalized.slug,
      status: normalized.status,
      data: toData(normalized),
    })
  }

  async update(id: string, input: LandingPageUpdate): Promise<ContentRecord> {
    const current = await this.require(id)
    const currentData = readData(current)
    const next = normalizeInput({
      title: input.title ?? current.title,
      slug: input.slug ?? current.slug,
      document: input.document ?? currentData.document,
      status: input.status ?? current.status,
      publishAt: input.publishAt === undefined ? currentData.publishAt : input.publishAt,
      timezone: input.timezone ?? currentData.timezone ?? 'UTC',
      seo: input.seo === undefined ? currentData.seo : input.seo,
    })

    const existing = await this.options.repository.findBySlug(LANDING_PAGE_CONTENT_TYPE, next.slug)
    if (existing && existing.id !== id) throw new Error(`Landing page slug already exists: ${next.slug}`)

    await this.saveRevision(current)
    return this.options.repository.update(id, {
      title: next.title,
      slug: next.slug,
      data: toData(next),
    })
  }

  async publish(id: string): Promise<ContentRecord> {
    const current = await this.require(id)
    if (current.status === 'publish') return current
    await this.saveRevision(current)
    return this.options.repository.updateStatus(id, 'publish')
  }

  async archive(id: string): Promise<ContentRecord> {
    const current = await this.require(id)
    if (current.status === 'archived') return current
    await this.saveRevision(current)
    return this.options.repository.updateStatus(id, 'archived')
  }

  get(id: string): Promise<ContentRecord> {
    return this.require(id)
  }

  list(): Promise<ContentRecord[]> {
    return this.options.repository.list(LANDING_PAGE_CONTENT_TYPE)
  }

  async rollback(id: string, revisionId: string): Promise<ContentRecord> {
    const current = await this.require(id)
    const revision = (await this.listRevisions(id)).find((item) => item.id === revisionId)
    if (!revision) throw new Error('Landing page revision not found')

    await this.saveRevision(current)
    const restored = await this.options.repository.update(id, {
      title: revision.title,
      slug: revision.slug,
      data: revision.data,
    })
    if (restored.status !== revision.status) return this.options.repository.updateStatus(id, revision.status)
    return restored
  }

  async findPublicBySlug(slug: string, now = this.now()): Promise<ContentRecord | undefined> {
    const record = await this.options.repository.findBySlug(LANDING_PAGE_CONTENT_TYPE, normalizeSlug(slug))
    if (!record || !isLandingPagePublished({ status: record.status, ...readData(record) }, now)) return undefined
    return record
  }

  async findPreviewById(id: string, token: string, now = this.now()): Promise<ContentRecord | undefined> {
    const payload = verifyPreviewToken(token, this.options.previewSecret, now)
    if (!payload || payload.landingPageId !== id) return undefined
    const record = await this.options.repository.findById(id)
    return record?.contentType === LANDING_PAGE_CONTENT_TYPE ? record : undefined
  }

  createPreviewToken(id: string, now = this.now(), ttlSeconds = 600): PreviewTokenResult {
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString()
    return { token: signPreviewToken(id, this.options.previewSecret, now, ttlSeconds), expiresAt }
  }

  listRevisions(id: string): Promise<LandingPageRevision[]> {
    return this.options.revisions.get<LandingPageRevision[]>(revisionKey(id)).then((items) => items ?? [])
  }

  private async require(id: string): Promise<ContentRecord> {
    const record = await this.options.repository.findById(id)
    if (!record || record.contentType !== LANDING_PAGE_CONTENT_TYPE) throw new Error('Landing page not found')
    return record
  }

  private async saveRevision(record: ContentRecord): Promise<void> {
    const revisions = await this.listRevisions(record.id)
    revisions.push({
      id: randomUUID(),
      title: record.title,
      slug: record.slug,
      status: record.status,
      data: structuredClone(record.data),
      createdAt: this.now().toISOString(),
    })
    await this.options.revisions.set(revisionKey(record.id), revisions)
  }
}

function normalizeInput(input: LandingPageInput): Required<Pick<LandingPageInput, 'title' | 'slug' | 'document' | 'status' | 'timezone'>> & {
  publishAt: string | null
  seo?: Record<string, unknown>
} {
  const title = input.title.trim()
  if (!title) throw new Error('Landing page title is required')
  if (!input.document || typeof input.document !== 'object' || Array.isArray(input.document)) {
    throw new Error('Landing page document must be an object')
  }
  const slug = normalizeSlug(input.slug || title)
  if (!slug) throw new Error('Landing page slug is required')
  const timezone = input.timezone?.trim() || 'UTC'
  if (input.publishAt !== undefined && input.publishAt !== null && Number.isNaN(new Date(input.publishAt).getTime())) {
    throw new Error('Landing page publishAt must be a valid date')
  }
  if (input.seo !== undefined && (!input.seo || typeof input.seo !== 'object' || Array.isArray(input.seo))) {
    throw new Error('Landing page SEO must be an object')
  }

  return {
    title,
    slug,
    document: input.document,
    status: input.status ?? 'draft',
    publishAt: input.publishAt ?? null,
    timezone,
    seo: input.seo,
  }
}

function toData(input: Pick<LandingPageInput, 'document' | 'publishAt' | 'timezone' | 'seo'>): Record<string, unknown> {
  return {
    document: input.document,
    publishAt: input.publishAt ?? null,
    timezone: input.timezone ?? 'UTC',
    ...(input.seo === undefined ? {} : { seo: input.seo }),
  }
}

function readData(record: ContentRecord): {
  document: Record<string, unknown>
  publishAt?: string | null
  timezone?: string | null
  seo?: Record<string, unknown>
} {
  return record.data as {
    document: Record<string, unknown>
    publishAt?: string | null
    timezone?: string | null
    seo?: Record<string, unknown>
  }
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function revisionKey(id: string): string {
  return `revisions.${id}`
}
