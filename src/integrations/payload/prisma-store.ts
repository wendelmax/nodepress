import prisma from '@/lib/prisma'
import type { PayloadImportCheckpoint, PayloadImportStore } from './contracts'

export class PrismaPayloadImportStore implements PayloadImportStore {
  async get(source: string, collection: string, sourceId: string): Promise<PayloadImportCheckpoint | undefined> {
    const row = await prisma.payloadImportRecord.findFirst({ where: { source, collection, sourceId } })
    return row ? toCheckpoint(row) : undefined
  }

  async save(checkpoint: PayloadImportCheckpoint): Promise<void> {
    await prisma.payloadImportRecord.upsert({
      where: { source_collection_sourceId: { source: checkpoint.source, collection: checkpoint.collection, sourceId: checkpoint.sourceId } },
      create: {
        source: checkpoint.source,
        collection: checkpoint.collection,
        sourceId: checkpoint.sourceId,
        targetId: checkpoint.targetId,
        targetType: checkpoint.targetType,
        slug: checkpoint.slug,
        importedAt: new Date(checkpoint.importedAt),
      },
      update: {
        targetId: checkpoint.targetId,
        targetType: checkpoint.targetType,
        slug: checkpoint.slug,
        importedAt: new Date(checkpoint.importedAt),
      },
    })
  }
}

function toCheckpoint(row: {
  source: string
  collection: string
  sourceId: string
  targetId: string
  targetType: string
  slug: string
  importedAt: Date
}): PayloadImportCheckpoint {
  return { ...row, importedAt: row.importedAt.toISOString() }
}
