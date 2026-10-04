import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  resolveThemeTemplate,
  type ThemeTemplateArea,
  type ThemeTemplateConditions,
  type ThemeTemplateDefinition,
  type ThemeTemplateResolutionContext,
  type ThemeTemplateDraft,
} from '@/lib/themes/templates'
import type { BuilderDocument } from '@/lib/puck/types'

type ThemeTemplateRow = {
  id: string
  slug: string
  themeSlug: string
  area: string
  name: string
  conditions: unknown
  priority: number
  enabled: boolean
  version: number
  document: unknown
  createdAt: Date
  updatedAt: Date
}

export type ThemeTemplateInput = ThemeTemplateDraft

function asConditions(value: unknown): ThemeTemplateConditions {
  return value && typeof value === 'object' ? value as ThemeTemplateConditions : {}
}

function toDefinition(row: ThemeTemplateRow): ThemeTemplateDefinition {
  return {
    id: row.id,
    themeSlug: row.themeSlug,
    area: row.area as ThemeTemplateArea,
    name: row.name,
    conditions: asConditions(row.conditions),
    priority: row.priority,
    enabled: row.enabled,
    version: row.version,
    document: row.document as BuilderDocument,
  }
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export class ThemeTemplateService {
  async list(themeSlug?: string): Promise<ThemeTemplateDefinition[]> {
    const rows = await prisma.themeTemplate.findMany({
      where: themeSlug ? { themeSlug } : undefined,
      orderBy: [{ themeSlug: 'asc' }, { area: 'asc' }, { priority: 'desc' }, { name: 'asc' }],
    }) as unknown as ThemeTemplateRow[]
    return rows.map(toDefinition)
  }

  async get(id: string, version?: number): Promise<ThemeTemplateDefinition | null> {
    const row = await prisma.themeTemplate.findUnique({ where: { id } }) as unknown as ThemeTemplateRow | null
    if (!row) return null
    if (version === undefined || version === row.version) return toDefinition(row)

    const historical = await prisma.themeTemplateVersion.findUnique({
      where: { templateId_version: { templateId: id, version } },
    })
    if (!historical) return null
    return { ...toDefinition(row), version: historical.version, document: historical.document as unknown as BuilderDocument }
  }

  async resolve(context: ThemeTemplateResolutionContext): Promise<ThemeTemplateDefinition | null> {
    const templates = await this.list(context.themeSlug)
    return resolveThemeTemplate(templates, context)
  }

  async create(input: ThemeTemplateInput): Promise<ThemeTemplateDefinition> {
    const row = await prisma.$transaction(async (transaction) => {
      const created = await transaction.themeTemplate.create({
        data: {
          slug: input.id,
          themeSlug: input.themeSlug,
          area: input.area,
          name: input.name,
          conditions: json(input.conditions),
          priority: input.priority,
          enabled: input.enabled,
          version: 1,
          document: json(input.document),
        },
      })
      await transaction.themeTemplateVersion.create({
        data: { templateId: created.id, version: 1, document: json(input.document) },
      })
      return created
    })
    return toDefinition(row as unknown as ThemeTemplateRow)
  }

  async update(id: string, input: ThemeTemplateInput): Promise<ThemeTemplateDefinition | null> {
    const current = await prisma.themeTemplate.findUnique({ where: { id } }) as unknown as ThemeTemplateRow | null
    if (!current) return null
    const version = current.version + 1
    const row = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.themeTemplate.update({
        where: { id },
        data: {
          slug: input.id,
          themeSlug: input.themeSlug,
          area: input.area,
          name: input.name,
          conditions: json(input.conditions),
          priority: input.priority,
          enabled: input.enabled,
          version,
          document: json(input.document),
        },
      })
      await transaction.themeTemplateVersion.create({
        data: { templateId: id, version, document: json(input.document) },
      })
      return updated
    })
    return toDefinition(row as unknown as ThemeTemplateRow)
  }

  async setEnabled(id: string, enabled: boolean): Promise<ThemeTemplateDefinition | null> {
    const row = await prisma.themeTemplate.updateMany({ where: { id }, data: { enabled } })
    if (row.count === 0) return null
    return this.get(id)
  }

  async rollback(id: string, version: number): Promise<ThemeTemplateDefinition | null> {
    const current = await prisma.themeTemplate.findUnique({ where: { id } }) as unknown as ThemeTemplateRow | null
    if (!current) return null
    const historical = await prisma.themeTemplateVersion.findUnique({
      where: { templateId_version: { templateId: id, version } },
    })
    if (!historical) return null

    const nextVersion = current.version + 1
    const row = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.themeTemplate.update({
        where: { id },
        data: { version: nextVersion, document: json(historical.document) },
      })
      await transaction.themeTemplateVersion.create({
        data: { templateId: id, version: nextVersion, document: json(historical.document) },
      })
      return updated
    })
    return toDefinition(row as unknown as ThemeTemplateRow)
  }
}

export const themeTemplateService = new ThemeTemplateService()
