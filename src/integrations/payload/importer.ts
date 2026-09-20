import type {
  MappedPayloadContent,
  PayloadCollection,
  PayloadContentWriter,
  PayloadExport,
  PayloadImportOptions,
  PayloadImportReport,
  PayloadImportStore,
  PayloadImportWarning,
  PayloadRecord,
  PayloadInputStatus,
  PendingPayloadRelation,
} from './contracts'
import type { PayloadImportCheckpoint } from './contracts'

export class PayloadImporter {
  constructor(
    private readonly writer: PayloadContentWriter,
    private readonly store: PayloadImportStore,
  ) {}

  async import(payload: PayloadExport, options: PayloadImportOptions): Promise<PayloadImportReport> {
    if (payload.version !== 1) throw new Error(`Unsupported Payload export version: ${payload.version}`)
    const source = options.source ?? payload.source ?? 'payload'
    const batchSize = Math.max(1, Math.floor(options.batchSize ?? 100))
    const dryRun = options.dryRun === true
    const resume = options.resume !== false
    const mappings = new Map(options.mappings.map((mapping) => [mapping.collection, mapping]))
    const report: PayloadImportReport = {
      source,
      dryRun,
      batches: 0,
      records: { seen: 0, imported: 0, skipped: 0, failed: 0 },
      relations: { resolved: 0, missing: 0 },
      warnings: [],
      errors: [],
    }
    const targetIds = new Map<string, string>()
    const pendingRelations: PendingPayloadRelation[] = []

    for (const collection of payload.collections) {
      const mapping = mappings.get(collection.name)
      if (!mapping) {
        report.warnings.push({ code: 'unknown_collection', collection: collection.name, message: `No mapping configured for collection: ${collection.name}` })
        continue
      }

      for (let offset = 0; offset < collection.records.length; offset += batchSize) {
        report.batches += 1
        const batch = collection.records.slice(offset, offset + batchSize)
        for (const sourceRecord of batch) {
          report.records.seen += 1
          const checkpoint = resume ? await this.store.get(source, collection.name, sourceRecord.id) : undefined
          let mapped: MappedPayloadContent
          try {
            mapped = await mapPayloadRecord(sourceRecord, mapping, options.media, dryRun, collection.name, report.warnings)
            const key = `${collection.name}:${sourceRecord.id}`
            if (checkpoint) {
              targetIds.set(key, checkpoint.targetId)
              report.records.skipped += 1
            } else if (dryRun) {
              await this.writer.validate(mapped.input)
              targetIds.set(key, `dry-run:${key}`)
            } else {
              const created = await this.writer.create(mapped.input)
              targetIds.set(key, created.id)
              await this.store.save({
                source,
                collection: collection.name,
                sourceId: sourceRecord.id,
                targetId: created.id,
                targetType: created.contentType,
                slug: created.slug,
                importedAt: new Date().toISOString(),
              })
              report.records.imported += 1
              await addRedirects(options, source, collection, sourceRecord, created.id, created.slug, report.warnings)
            }
            pendingRelations.push(...mapped.relations.map((relation) => ({
              ...relation,
              targetId: targetIds.get(key) || relation.targetId,
            })))
          } catch (error) {
            report.records.failed += 1
            report.errors.push({ collection: collection.name, sourceId: sourceRecord.id, message: error instanceof Error ? error.message : 'Payload record import failed' })
          }
        }
      }
    }

    if (!dryRun) await this.resolveRelations(pendingRelations, targetIds, report)
    return report
  }

  private async resolveRelations(relations: PendingPayloadRelation[], targetIds: Map<string, string>, report: PayloadImportReport): Promise<void> {
    for (const relation of relations) {
      const resolved = targetIds.get(`${relation.targetCollection}:${relation.sourceRelationId}`)
      if (!resolved) {
        report.relations.missing += 1
        report.warnings.push({ code: 'missing_relation', collection: relation.targetCollection, sourceId: relation.sourceRelationId, message: `Relation target not found: ${relation.targetCollection}/${relation.sourceRelationId}` })
        continue
      }
      await this.writer.update(relation.targetId, { [relation.targetField]: relation.multiple ? [resolved] : resolved })
      report.relations.resolved += 1
    }
  }
}

async function mapPayloadRecord(
  record: PayloadRecord,
  mapping: PayloadImportOptions['mappings'][number],
  media: PayloadImportOptions['media'],
  dryRun: boolean,
  collection: string,
  warnings: PayloadImportWarning[],
): Promise<MappedPayloadContent> {
  const title = readValue(record.data, mapping.titleField)
  if (typeof title !== 'string' || !title.trim()) throw new Error(`Missing title field: ${mapping.titleField}`)
  const data: Record<string, unknown> = {}
  for (const [targetField, sourceField] of Object.entries(mapping.fields)) {
    const value = readValue(record.data, sourceField)
    if (value !== undefined) data[targetField] = await mapMedia(targetField, value, mapping, media, dryRun, collection, record.id, warnings)
  }

  const relations: PendingPayloadRelation[] = []
  for (const [targetField, relation] of Object.entries(mapping.relations ?? {})) {
    const value = readValue(record.data, relation.sourceField)
    const sourceIds = Array.isArray(value) ? value : [value]
    for (const sourceId of sourceIds.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')) {
      relations.push({ targetId: '', targetField, targetCollection: relation.collection, sourceRelationId: String(sourceId), multiple: relation.multiple === true })
    }
  }

  const status = mapping.statusField ? readValue(record.data, mapping.statusField) : undefined
  if (status !== undefined && !isContentStatus(status)) throw new Error(`Invalid content status: ${String(status)}`)
  return {
    input: {
      contentType: mapping.contentType,
      title: title.trim(),
      slug: mapping.slugField ? asOptionalString(readValue(record.data, mapping.slugField)) : undefined,
      status: status as PayloadInputStatus | undefined,
      data,
    },
    relations,
  }
}

async function mapMedia(
  targetField: string,
  value: unknown,
  mapping: PayloadImportOptions['mappings'][number],
  media: PayloadImportOptions['media'],
  dryRun: boolean,
  collection: string,
  sourceId: string,
  warnings: PayloadImportWarning[],
): Promise<unknown> {
  const mediaMapping = mapping.media?.[targetField]
  if (!mediaMapping || typeof value !== 'string' || !media || dryRun) return value
  try {
    return await media.import(value, { contentType: mediaMapping.contentType })
  } catch (error) {
    warnings.push({ code: 'media_failed', collection, sourceId, message: `Media kept as original URL for ${targetField}: ${error instanceof Error ? error.message : 'download failed'}` })
    return value
  }
}

async function addRedirects(
  options: PayloadImportOptions,
  source: string,
  collection: PayloadCollection,
  record: PayloadRecord,
  targetId: string,
  targetSlug: string,
  warnings: PayloadImportWarning[],
): Promise<void> {
  if (!options.redirects || !record.previousSlugs?.length) return
  for (const fromSlug of record.previousSlugs.filter((slug) => slug && slug !== targetSlug)) {
    try {
      await options.redirects.add({ source, collection: collection.name, fromSlug, toSlug: targetSlug, targetId })
    } catch (error) {
      warnings.push({ code: 'redirect_failed', collection: collection.name, sourceId: record.id, message: error instanceof Error ? error.message : 'redirect creation failed' })
    }
  }
}

function readValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => value && typeof value === 'object' ? (value as Record<string, unknown>)[segment] : undefined, data)
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isContentStatus(value: unknown): value is PayloadInputStatus {
  return value === 'draft' || value === 'publish' || value === 'archived'
}
