import type { BackupSection, NodePressBackupPackage, BackupMediaEntry } from './types'

const SUPPORTED_SECTIONS = new Set<BackupSection>(['users', 'posts', 'taxonomies', 'options'])

export type ExistingIds = Partial<Record<BackupSection, ReadonlySet<string | number>>>

export interface ImportPlanOptions {
  fromUrl?: string
  toUrl?: string
  existingIds?: ExistingIds
}

export interface ImportPlan {
  database: Record<string, unknown[]>
  media: BackupMediaEntry[]
  extensions: NodePressBackupPackage['extensions']
  counts: Partial<Record<BackupSection, { total: number; insertable: number; skipped: number }>>
  warnings: string[]
}

export function planImport(pkg: NodePressBackupPackage, options: ImportPlanOptions = {}): ImportPlan {
  const database: Record<string, unknown[]> = {}
  const counts: ImportPlan['counts'] = {}
  const warnings: string[] = []
  const existingIds = options.existingIds ?? {}

  for (const [section, value] of Object.entries(pkg.database)) {
    if (!SUPPORTED_SECTIONS.has(section as BackupSection)) throw new Error(`Unsupported backup section: ${section}`)
    if (!Array.isArray(value)) throw new Error(`Backup section ${section} must be an array`)
    const typedSection = section as BackupSection
    const rows = value.map((row) => normalizeValue(row, options.fromUrl, options.toUrl))
    const existing = existingIds[typedSection]
    const skipped = existing ? rows.filter((row) => existing.has(recordIdentity(typedSection, row))).length : 0
    database[section] = rows
    counts[typedSection] = { total: rows.length, insertable: rows.length - skipped, skipped }
    if (skipped > 0) warnings.push(`${skipped} ${section} record(s) already exist and will be skipped`)
  }

  const media = pkg.media.map((entry) => ({
    ...entry,
    sourceUrl: replaceUrl(entry.sourceUrl, options.fromUrl, options.toUrl),
  }))
  return { database, media, extensions: normalizeValue(pkg.extensions, options.fromUrl, options.toUrl) as ImportPlan['extensions'], counts, warnings }
}

function recordIdentity(section: BackupSection, row: unknown): string | number {
  if (!row || typeof row !== 'object') throw new Error(`Invalid ${section} record`)
  const value = row as Record<string, unknown>
  const identity = section === 'options' ? value.optionName : section === 'taxonomies' ? value.termId ?? value.termTaxonomyId : value.id
  if (typeof identity !== 'string' && typeof identity !== 'number') throw new Error(`Missing identity for ${section} record`)
  return identity
}

function normalizeValue(value: unknown, fromUrl?: string, toUrl?: string): unknown {
  if (typeof value === 'string') return replaceUrl(value, fromUrl, toUrl)
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item, fromUrl, toUrl))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item, fromUrl, toUrl)]))
  return value
}

function replaceUrl(value: string, fromUrl?: string, toUrl?: string): string {
  return fromUrl && toUrl ? value.split(fromUrl).join(toUrl) : value
}
