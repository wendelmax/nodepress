import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { BuilderDocument } from '@/lib/puck/types'
import type { PatternKind, PatternManifest, PatternPackage } from '@/lib/puck/patterns'
import { defaultPatterns } from '@/lib/puck/default-patterns'

type PatternRow = {
  id: string
  slug: string
  name: string
  description: string
  kind: string
  category: string
  tags: unknown
  engine: string
  schemaVersion: number
  version: number
  document: unknown
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PatternListFilters {
  search?: string
  category?: string
  tag?: string
  includeArchived?: boolean
}

export interface PatternSummary {
  id: string
  slug: string
  name: string
  description: string
  kind: PatternKind
  category: string
  tags: string[]
  engine: string
  schemaVersion: number
  version: number
  archived: boolean
  updatedAt: string
}

function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : []
}

function toSummary(row: PatternRow): PatternSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    kind: row.kind as PatternKind,
    category: row.category,
    tags: asTags(row.tags),
    engine: row.engine,
    schemaVersion: row.schemaVersion,
    version: row.version,
    archived: Boolean(row.archivedAt),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function manifestFromRow(row: PatternRow, version = row.version): PatternManifest {
  return {
    format: 'nodepress-pattern',
    formatVersion: 1,
    id: row.slug,
    name: row.name,
    description: row.description,
    kind: row.kind as PatternKind,
    category: row.category,
    tags: asTags(row.tags),
    engine: row.engine,
    schemaVersion: row.schemaVersion as 1,
    version,
  }
}

function documentValue(value: unknown): BuilderDocument {
  return value as BuilderDocument
}

export class PatternService {
  async seedDefaults(): Promise<number> {
    let created = 0
    for (const pattern of defaultPatterns) {
      const existing = await prisma.builderPattern.findUnique({ where: { slug: pattern.manifest.id }, select: { id: true } })
      if (existing) continue
      await this.create(pattern)
      created += 1
    }
    return created
  }

  async list(filters: PatternListFilters = {}): Promise<PatternSummary[]> {
    const search = filters.search?.trim()
    const rows = await prisma.builderPattern.findMany({
      where: {
        archivedAt: filters.includeArchived ? undefined : null,
        category: filters.category || undefined,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    }) as unknown as PatternRow[]

    const tag = filters.tag?.trim().toLowerCase()
    return rows
      .filter((row) => !tag || asTags(row.tags).some((candidate) => candidate.toLowerCase() === tag))
      .map(toSummary)
  }

  async get(idOrSlug: string, version?: number): Promise<PatternPackage | null> {
    const row = await prisma.builderPattern.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    }) as unknown as PatternRow | null
    if (!row) return null

    if (version !== undefined && version !== row.version) {
      const historical = await prisma.builderPatternVersion.findUnique({
        where: { patternId_version: { patternId: row.id, version } },
      })
      if (!historical) return null
      return {
        manifest: manifestFromRow(row, historical.version),
        document: documentValue(historical.document),
      }
    }

    return {
      manifest: manifestFromRow(row),
      document: documentValue(row.document),
    }
  }

  async create(pattern: PatternPackage): Promise<PatternSummary> {
    const row = await prisma.$transaction(async (transaction) => {
      const created = await transaction.builderPattern.create({
        data: {
          slug: pattern.manifest.id,
          name: pattern.manifest.name,
          description: pattern.manifest.description,
          kind: pattern.manifest.kind,
          category: pattern.manifest.category,
          tags: pattern.manifest.tags,
          engine: pattern.manifest.engine,
          schemaVersion: pattern.manifest.schemaVersion,
          version: 1,
          document: pattern.document as unknown as Prisma.InputJsonValue,
        },
      })
      await transaction.builderPatternVersion.create({
        data: {
          patternId: created.id,
          version: 1,
          manifest: { ...pattern.manifest, version: 1 },
          document: pattern.document as unknown as Prisma.InputJsonValue,
        },
      })
      return created
    })
    return toSummary(row as unknown as PatternRow)
  }

  async update(id: string, pattern: PatternPackage): Promise<PatternSummary | null> {
    const current = await prisma.builderPattern.findUnique({ where: { id } }) as unknown as PatternRow | null
    if (!current) return null
    const version = current.version + 1
    const row = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.builderPattern.update({
        where: { id },
        data: {
          slug: pattern.manifest.id,
          name: pattern.manifest.name,
          description: pattern.manifest.description,
          kind: pattern.manifest.kind,
          category: pattern.manifest.category,
          tags: pattern.manifest.tags,
          engine: pattern.manifest.engine,
          schemaVersion: pattern.manifest.schemaVersion,
          version,
          document: pattern.document as unknown as Prisma.InputJsonValue,
        },
      })
      await transaction.builderPatternVersion.create({
        data: {
          patternId: id,
          version,
          manifest: { ...pattern.manifest, version },
          document: pattern.document as unknown as Prisma.InputJsonValue,
        },
      })
      return updated
    })
    return toSummary(row as unknown as PatternRow)
  }

  async archive(id: string): Promise<boolean> {
    const result = await prisma.builderPattern.updateMany({
      where: { id, archivedAt: null },
      data: { archivedAt: new Date() },
    })
    return result.count === 1
  }
}

export const patternService = new PatternService()
