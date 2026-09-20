import { describe, expect, it } from 'vitest'
import type { ContentRecord, CreateContentInput } from '@/modules/content/content.service'
import type {
  PayloadContentWriter,
  PayloadExport,
  PayloadImportCheckpoint,
  PayloadImportMapping,
  PayloadImportStore,
} from '../contracts'
import { PayloadImporter } from '../importer'

describe('Payload importer', () => {
  it('imports mapped records in batches and skips them on a repeated run', async () => {
    const writer = new MemoryWriter()
    const store = new MemoryStore()
    const importer = new PayloadImporter(writer, store)
    const payload = exportFixture()

    const first = await importer.import(payload, { mappings: [animalMapping], batchSize: 1 })
    const second = await importer.import(payload, { mappings: [animalMapping], batchSize: 1 })

    expect(first.records).toMatchObject({ seen: 2, imported: 2, skipped: 0, failed: 0 })
    expect(first.batches).toBe(2)
    expect(second.records).toMatchObject({ seen: 2, imported: 0, skipped: 2, failed: 0 })
    expect(writer.created).toHaveLength(2)
  })

  it('validates without writing during dry-run and reports unknown collections', async () => {
    const writer = new MemoryWriter()
    const importer = new PayloadImporter(writer, new MemoryStore())
    const report = await importer.import({
      version: 1,
      collections: [{ name: 'unknown', records: [{ id: 'x', data: {} }] }],
    }, { mappings: [animalMapping], dryRun: true })

    expect(report.dryRun).toBe(true)
    expect(report.records.imported).toBe(0)
    expect(writer.created).toHaveLength(0)
    expect(report.warnings).toEqual([expect.objectContaining({ code: 'unknown_collection' })])
  })

  it('resolves relations in a second pass and warns about missing targets', async () => {
    const writer = new MemoryWriter()
    const importer = new PayloadImporter(writer, new MemoryStore())
    const report = await importer.import({
      version: 1,
      collections: [
        { name: 'people', records: [{ id: 'p1', data: { name: 'Ana' } }] },
        { name: 'animals', records: [{ id: 'a1', data: { name: 'Rex', person: 'p1' } }, { id: 'a2', data: { name: 'Mia', person: 'missing' } }] },
      ],
    }, {
      mappings: [personMapping, animalWithRelationMapping],
    })

    expect(report.relations).toEqual({ resolved: 1, missing: 1 })
    expect(writer.updated[0]).toMatchObject({ id: 'content-2', data: { guardian: 'content-1' } })
    expect(report.warnings).toEqual([expect.objectContaining({ code: 'missing_relation' })])
  })

  it('reports invalid mapped records and continues with the remaining batch', async () => {
    const writer = new MemoryWriter()
    const importer = new PayloadImporter(writer, new MemoryStore())
    const report = await importer.import({
      version: 1,
      collections: [{ name: 'animals', records: [
        { id: 'bad', data: { name: 42 } },
        { id: 'good', data: { name: 'Rex' } },
      ] }],
    }, { mappings: [animalMapping] })

    expect(report.records).toMatchObject({ seen: 2, imported: 1, failed: 1 })
    expect(report.errors).toEqual([expect.objectContaining({ collection: 'animals', sourceId: 'bad' })])
    expect(writer.created).toHaveLength(1)
  })

  it('keeps the original media URL and reports redirect failures', async () => {
    const writer = new MemoryWriter()
    const importer = new PayloadImporter(writer, new MemoryStore())
    const report = await importer.import({
      version: 1,
      collections: [{ name: 'animals', records: [{ id: 'a1', data: { name: 'Rex', slug: 'rex', image: 'https://example.test/rex.jpg' }, previousSlugs: ['old-rex'] }] }],
    }, {
      mappings: [{ ...animalMapping, fields: { name: 'name', image: 'image' }, media: { image: { sourceField: 'image' } } }],
      media: { import: async () => { throw new Error('storage unavailable') } },
      redirects: { add: async () => { throw new Error('redirect store unavailable') } },
    })

    expect(writer.created[0]?.data.image).toBe('https://example.test/rex.jpg')
    expect(report.warnings.map((warning) => warning.code)).toEqual(['media_failed', 'redirect_failed'])
  })
})

const animalMapping: PayloadImportMapping = {
  collection: 'animals',
  contentType: 'animal',
  titleField: 'name',
  slugField: 'slug',
  fields: { name: 'name', status: 'status' },
}

const personMapping: PayloadImportMapping = {
  collection: 'people',
  contentType: 'person',
  titleField: 'name',
  fields: { name: 'name' },
}

const animalWithRelationMapping: PayloadImportMapping = {
  ...animalMapping,
  relations: { guardian: { collection: 'people', sourceField: 'person' } },
  fields: { name: 'name' },
}

function exportFixture(): PayloadExport {
  return {
    version: 1,
    collections: [{ name: 'animals', records: [
      { id: 'a1', data: { name: 'Rex', slug: 'rex', status: 'draft' } },
      { id: 'a2', data: { name: 'Mia', slug: 'mia', status: 'draft' } },
    ] }],
  }
}

class MemoryStore implements PayloadImportStore {
  private readonly checkpoints = new Map<string, PayloadImportCheckpoint>()

  async get(source: string, collection: string, sourceId: string) {
    return this.checkpoints.get(`${source}:${collection}:${sourceId}`)
  }

  async save(checkpoint: PayloadImportCheckpoint) {
    this.checkpoints.set(`${checkpoint.source}:${checkpoint.collection}:${checkpoint.sourceId}`, checkpoint)
  }
}

class MemoryWriter implements PayloadContentWriter {
  created: CreateContentInput[] = []
  updated: Array<{ id: string; data: Record<string, unknown> }> = []
  private nextId = 1

  async validate(input: CreateContentInput) {
    if (typeof input.data.name !== 'string') throw new Error('Invalid name')
  }

  async create(input: CreateContentInput): Promise<ContentRecord> {
    await this.validate(input)
    this.created.push(input)
    return record(`content-${this.nextId++}`, input)
  }

  async update(id: string, data: Record<string, unknown>): Promise<ContentRecord> {
    this.updated.push({ id, data })
    return record(id, { contentType: 'animal', title: 'Updated', data })
  }
}

function record(id: string, input: CreateContentInput): ContentRecord {
  const now = new Date()
  return { id, contentType: input.contentType, title: input.title, slug: input.slug || input.title.toLowerCase(), status: input.status || 'draft', data: input.data, createdAt: now, updatedAt: now }
}
