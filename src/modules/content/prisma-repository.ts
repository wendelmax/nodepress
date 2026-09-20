import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import type { ContentRecord, ContentRepository, ContentStatus } from './content.service'

export class PrismaContentRepository implements ContentRepository {
  async create(input: Omit<ContentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentRecord> {
    const row = await prisma.contentRecord.create({
      data: {
        contentType: input.contentType,
        tenantId: input.tenantId,
        title: input.title,
        slug: input.slug,
        status: input.status,
        data: input.data as Prisma.InputJsonValue,
      },
    })
    return toContentRecord(row)
  }

  async updateStatus(id: string, status: ContentStatus): Promise<ContentRecord> {
    return toContentRecord(await prisma.contentRecord.update({ where: { id }, data: { status } }))
  }

  async findBySlug(contentType: string, slug: string, tenantId?: string): Promise<ContentRecord | undefined> {
    const row = await prisma.contentRecord.findFirst({ where: { contentType, slug, tenantId } })
    return row ? toContentRecord(row) : undefined
  }
}

function toContentRecord(row: {
  id: string
  contentType: string
  tenantId: string | null
  title: string
  slug: string
  status: string
  data: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}): ContentRecord {
  return {
    id: row.id,
    contentType: row.contentType,
    tenantId: row.tenantId ?? undefined,
    title: row.title,
    slug: row.slug,
    status: row.status as ContentStatus,
    data: row.data as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
