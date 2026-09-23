import { readFile } from 'node:fs/promises'
import type { PayloadExport, PayloadSource } from './contracts'

export class JsonPayloadSource implements PayloadSource {
  constructor(private readonly filePath: string) {}

  async read(): Promise<PayloadExport> {
    const raw = await readFile(this.filePath, 'utf8')
    return parsePayloadExport(JSON.parse(raw))
  }
}

export class RestPayloadSource implements PayloadSource {
  constructor(private readonly endpoint: string, private readonly token: string) {}

  async read(): Promise<PayloadExport> {
    const response = await fetch(this.endpoint, { headers: { Authorization: `JWT ${this.token}`, Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Payload REST source failed: ${response.status}`)
    return parsePayloadExport(await response.json())
  }
}

export function parsePayloadExport(value: unknown): PayloadExport {
  if (!value || typeof value !== 'object') throw new Error('Payload export must be an object')
  const exportValue = value as { version?: unknown; collections?: unknown }
  if (exportValue.version !== 1) throw new Error('Payload export version must be 1')
  if (!Array.isArray(exportValue.collections)) throw new Error('Payload export collections must be an array')
  return {
    version: 1,
    source: typeof (value as { source?: unknown }).source === 'string' ? (value as { source: string }).source : undefined,
    collections: exportValue.collections.map(parseCollection),
  }
}

function parseCollection(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Payload collection must be an object')
  const collection = value as { name?: unknown; records?: unknown }
  if (typeof collection.name !== 'string' || !collection.name) throw new Error('Payload collection name is required')
  if (!Array.isArray(collection.records)) throw new Error(`Payload records must be an array: ${collection.name}`)
  return {
    name: collection.name,
    records: collection.records.map((record) => {
      if (!record || typeof record !== 'object') throw new Error(`Payload record must be an object: ${collection.name}`)
      const item = record as { id?: unknown; data?: unknown; previousSlugs?: unknown }
      if (typeof item.id !== 'string' || !item.id) throw new Error(`Payload record id is required: ${collection.name}`)
      if (!item.data || typeof item.data !== 'object' || Array.isArray(item.data)) throw new Error(`Payload record data must be an object: ${collection.name}/${item.id}`)
      return {
        id: item.id,
        data: item.data as Record<string, unknown>,
        previousSlugs: Array.isArray(item.previousSlugs) ? item.previousSlugs.filter((slug): slug is string => typeof slug === 'string') : undefined,
      }
    }),
  }
}
