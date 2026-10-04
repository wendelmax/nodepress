import {
  isBuilderDocument,
  parseBuilderDocument,
  validateBuilderComponents,
} from './document'
import { validateBuilderLayoutDocument } from './layout/schema'
import type { BuilderDocument } from './types'

export const PATTERN_FORMAT = 'nodepress-pattern' as const
export const PATTERN_FORMAT_VERSION = 1 as const
export const PATTERN_SCHEMA_VERSION = 1 as const
export const MAX_PATTERN_PACKAGE_BYTES = 1_000_000
export const MAX_PATTERN_REFERENCE_DEPTH = 8

export const patternKinds = ['component', 'section', 'page', 'kit'] as const
export type PatternKind = typeof patternKinds[number]

export interface PatternManifest {
  format: typeof PATTERN_FORMAT
  formatVersion: typeof PATTERN_FORMAT_VERSION
  id: string
  name: string
  description: string
  kind: PatternKind
  category: string
  tags: string[]
  engine: string
  schemaVersion: typeof PATTERN_SCHEMA_VERSION
  version: number
}

export interface PatternPackage {
  manifest: PatternManifest
  document: BuilderDocument
}

export interface PatternReferenceProps {
  patternId: string
  version?: number
}

export interface PatternReferenceNode {
  type: 'PatternReference'
  props: PatternReferenceProps
}

type PatternParseResult =
  | { valid: true; package: PatternPackage }
  | { valid: false; reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCompatibleEngine(engine: unknown): engine is string {
  return typeof engine === 'string' && /^(?:>=|\^|~)?1\.\d+\.\d+$/.test(engine.trim())
}

function parseInput(value: unknown): { value: unknown } | { reason: string } {
  if (typeof value !== 'string') return { value }
  if (new TextEncoder().encode(value).byteLength > MAX_PATTERN_PACKAGE_BYTES) {
    return { reason: 'pattern package exceeds the maximum size' }
  }

  try {
    return { value: JSON.parse(value) }
  } catch {
    return { reason: 'pattern package contains invalid JSON' }
  }
}

export function parsePatternPackage(
  input: unknown,
  componentIds: ReadonlySet<string>,
): PatternParseResult {
  const parsed = parseInput(input)
  if ('reason' in parsed) return { valid: false, reason: parsed.reason }
  if (!isRecord(parsed.value)) return { valid: false, reason: 'pattern package must be an object' }

  const manifest = parsed.value.manifest
  if (!isRecord(manifest)) return { valid: false, reason: 'pattern manifest is required' }
  if (manifest.format !== PATTERN_FORMAT || manifest.formatVersion !== PATTERN_FORMAT_VERSION) {
    return { valid: false, reason: 'pattern manifest format is unsupported' }
  }
  if (!patternKinds.includes(manifest.kind as PatternKind)) {
    return { valid: false, reason: 'pattern kind is invalid' }
  }
  if (typeof manifest.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(manifest.id)) {
    return { valid: false, reason: 'pattern id is invalid' }
  }
  if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0 || manifest.name.length > 120) {
    return { valid: false, reason: 'pattern name is invalid' }
  }
  if (typeof manifest.description !== 'string' || manifest.description.length > 500) {
    return { valid: false, reason: 'pattern description is invalid' }
  }
  if (typeof manifest.category !== 'string' || manifest.category.length > 80) {
    return { valid: false, reason: 'pattern category is invalid' }
  }
  if (!Array.isArray(manifest.tags) || manifest.tags.some((tag) => typeof tag !== 'string' || tag.length > 40)) {
    return { valid: false, reason: 'pattern tags are invalid' }
  }
  if (!isCompatibleEngine(manifest.engine)) {
    return { valid: false, reason: 'pattern engine is incompatible' }
  }
  if (manifest.schemaVersion !== PATTERN_SCHEMA_VERSION || typeof manifest.version !== 'number' || !Number.isInteger(manifest.version) || manifest.version < 1) {
    return { valid: false, reason: 'pattern schema or version is invalid' }
  }

  const document = parseBuilderDocument(parsed.value.document)
  if (document.kind !== 'puck') return { valid: false, reason: 'pattern document is invalid' }
  const componentValidation = validateBuilderComponents(document.document, componentIds)
  if (!componentValidation.valid) {
    return {
      valid: false,
      reason: `pattern document contains unavailable components: ${componentValidation.unknownTypes.join(', ')}`,
    }
  }
  if (!validateBuilderLayoutDocument(document.document).valid) {
    return { valid: false, reason: 'pattern document contains invalid layout props' }
  }

  return {
    valid: true,
    package: {
      manifest: {
        format: PATTERN_FORMAT,
        formatVersion: PATTERN_FORMAT_VERSION,
        id: manifest.id,
        name: manifest.name.trim(),
        description: manifest.description,
        kind: manifest.kind as PatternKind,
        category: manifest.category,
        tags: [...manifest.tags] as string[],
        engine: manifest.engine,
        schemaVersion: PATTERN_SCHEMA_VERSION,
        version: manifest.version,
      },
      document: document.document,
    },
  }
}

export function createPatternReference(patternId: string, version?: number): PatternReferenceNode {
  return {
    type: 'PatternReference',
    props: {
      patternId,
      ...(version === undefined ? {} : { version }),
    },
  }
}

function isPatternReference(value: unknown): value is PatternReferenceNode {
  if (!isRecord(value) || value.type !== 'PatternReference' || !isRecord(value.props)) return false
  return typeof value.props.patternId === 'string' &&
    (value.props.version === undefined || (typeof value.props.version === 'number' && Number.isInteger(value.props.version)))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export async function resolvePatternReferences(
  document: BuilderDocument,
  lookup: (patternId: string, version?: number) => Promise<BuilderDocument | null>,
): Promise<BuilderDocument> {
  const resolveValue = async (value: unknown, depth: number, seen: Set<string>): Promise<unknown> => {
    if (isPatternReference(value)) {
      if (depth >= MAX_PATTERN_REFERENCE_DEPTH || seen.has(value.props.patternId)) return value
      const referenced = await lookup(value.props.patternId, value.props.version)
      if (!referenced) return value
      const nextSeen = new Set(seen)
      nextSeen.add(value.props.patternId)
      return resolveValue(referenced.content, depth + 1, nextSeen)
    }
    if (Array.isArray(value)) {
      const resolvedItems = await Promise.all(value.map((item) => resolveValue(item, depth, seen)))
      return resolvedItems.flatMap((item) => Array.isArray(item) ? item : [item])
    }
    if (!isRecord(value)) return value

    const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [
      key,
      await resolveValue(child, depth, seen),
    ] as const))
    return Object.fromEntries(entries)
  }

  const resolved = await resolveValue(clone(document), 0, new Set())
  return resolved as BuilderDocument
}

export function isPatternReferenceNode(value: unknown): value is PatternReferenceNode {
  return isPatternReference(value)
}

export function isPatternDocument(value: unknown): value is BuilderDocument {
  return isBuilderDocument(value)
}
