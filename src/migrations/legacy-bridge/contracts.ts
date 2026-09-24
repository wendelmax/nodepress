export const bridgeResources = ['pages', 'posts', 'media', 'users', 'animals', 'volunteers'] as const

export type BridgeResource = typeof bridgeResources[number]

export interface LegacyExportRequest {
  resource: BridgeResource
  runId: string
  cursor?: string
  updatedSince?: string
  limit: number
}

export interface LegacyExportItem {
  legacyId: string
  updatedAt: string
  payload: Record<string, unknown>
}

export interface LegacyExportPage {
  contractVersion: '1'
  resource: BridgeResource
  runId: string
  watermark: string
  items: LegacyExportItem[]
  nextCursor?: string
  pageChecksum: string
}

export type MigrationRunStatus = 'running' | 'passed' | 'failed'

export interface MigrationRunResult {
  runId: string
  resource: BridgeResource
  status: MigrationRunStatus
  imported: number
  created: number
  updated: number
  failed: number
  retried: number
}

export function parseLegacyExportPage(input: unknown): LegacyExportPage {
  if (!isRecord(input)) throw new Error('Invalid bridge contract')
  if (input.contractVersion !== '1') throw new Error('Unsupported bridge contract')
  if (!isBridgeResource(input.resource)) throw new Error('Invalid bridge resource')
  if (!isNonEmptyString(input.runId)) throw new Error('Invalid bridge run id')
  if (!isIsoDate(input.watermark)) throw new Error('Invalid bridge watermark')
  if (!Array.isArray(input.items)) throw new Error('Invalid bridge items')
  if (!isNonEmptyString(input.pageChecksum)) throw new Error('Invalid bridge page checksum')
  if (input.nextCursor !== undefined && !isNonEmptyString(input.nextCursor)) throw new Error('Invalid bridge cursor')

  const items = input.items.map(parseLegacyExportItem)
  return {
    contractVersion: '1',
    resource: input.resource,
    runId: input.runId,
    watermark: input.watermark,
    items,
    ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}),
    pageChecksum: input.pageChecksum,
  }
}

function parseLegacyExportItem(input: unknown): LegacyExportItem {
  if (!isRecord(input)) throw new Error('Invalid bridge item')
  if (!isNonEmptyString(input.legacyId)) throw new Error('Invalid bridge legacy id')
  if (!isIsoDate(input.updatedAt)) throw new Error('Invalid bridge item timestamp')
  if (!isRecord(input.payload)) throw new Error('Invalid bridge item payload')
  return { legacyId: input.legacyId, updatedAt: input.updatedAt, payload: input.payload }
}

function isBridgeResource(value: unknown): value is BridgeResource {
  return typeof value === 'string' && bridgeResources.includes(value as BridgeResource)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
