import type {
  BuilderDocument,
  BuilderParseResult,
} from './types'

export const MAX_BUILDER_DOCUMENT_BYTES = 1_000_000
export const MAX_BUILDER_DOCUMENT_DEPTH = 32

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(reason: string): BuilderParseResult {
  return { kind: 'invalid', reason }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function exceedsDepth(value: unknown): boolean {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) continue
    if (current.depth > MAX_BUILDER_DOCUMENT_DEPTH) return true

    if (Array.isArray(current.value)) {
      for (const child of current.value) {
        pending.push({ value: child, depth: current.depth + 1 })
      }
    } else if (isRecord(current.value)) {
      for (const child of Object.values(current.value)) {
        pending.push({ value: child, depth: current.depth + 1 })
      }
    }
  }

  return false
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isRecord(value)) return value

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue(value[key])
      return result
    }, {})
}

type JsonStringResult =
  | { parsed: true; value: unknown }
  | { parsed: false; result: BuilderParseResult }

function parseJsonString(value: string): JsonStringResult {
  const trimmed = value.trim()

  if (byteLength(value) > MAX_BUILDER_DOCUMENT_BYTES) {
    return { parsed: false, result: invalid('builder document exceeds the maximum size') }
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { parsed: false, result: { kind: 'html', content: value } }
  }

  try {
    return { parsed: true, value: JSON.parse(value) }
  } catch {
    return { parsed: false, result: invalid('builder document contains invalid JSON') }
  }
}

function hasPuckShape(value: Record<string, unknown>): boolean {
  return 'root' in value || 'content' in value || 'version' in value || 'metadata' in value
}

function isMetadata(value: unknown): value is BuilderDocument['metadata'] {
  if (!isRecord(value)) return false
  return value.editor === 'puck'
    && value.schemaVersion === 1
    && (value.updatedAt === undefined || typeof value.updatedAt === 'string')
}

function isValidTree(value: Record<string, unknown>): value is Record<string, unknown> & {
  root: Record<string, unknown>
  content: unknown[]
} {
  return isRecord(value.root) && Array.isArray(value.content)
}

function parsePuckDocument(value: Record<string, unknown>): BuilderParseResult {
  if (!isValidTree(value)) return invalid('builder document has an invalid tree')

  const hasVersion = 'version' in value
  const hasMetadata = 'metadata' in value

  if (hasVersion && value.version !== 1) {
    return invalid('builder document version is unsupported')
  }

  if (hasVersion !== hasMetadata) {
    return invalid('builder document metadata is incomplete')
  }

  if (!hasVersion) {
    return {
      kind: 'puck',
      document: {
        version: 1,
        content: value.content,
        root: value.root,
        metadata: {
          editor: 'puck',
          schemaVersion: 1,
        },
      },
    }
  }

  if (!isMetadata(value.metadata)) {
    return invalid('builder document metadata is invalid')
  }

  return {
    kind: 'puck',
    document: {
      version: 1,
      content: value.content,
      root: value.root,
      metadata: value.metadata,
    },
  }
}

export function parseBuilderDocument(value: unknown): BuilderParseResult {
  let parsed: unknown = value

  if (typeof value === 'string') {
    const result = parseJsonString(value)
    if (!result.parsed) {
      return result.result
    }
    parsed = result.value
  }

  if (parsed === null || typeof parsed !== 'object') {
    return invalid('builder document must be an object')
  }

  if (exceedsDepth(parsed)) {
    return invalid('builder document exceeds the maximum depth')
  }

  try {
    if (byteLength(JSON.stringify(parsed)) > MAX_BUILDER_DOCUMENT_BYTES) {
      return invalid('builder document exceeds the maximum size')
    }
  } catch {
    return invalid('builder document cannot be serialized')
  }

  if (Array.isArray(parsed)) return invalid('builder document must be an object')

  const object = parsed as Record<string, unknown>
  if (Array.isArray(object.blocks)) {
    return { kind: 'editorjs', document: parsed }
  }

  if (!hasPuckShape(object)) return invalid('builder document format is unsupported')
  return parsePuckDocument(object)
}

export function isBuilderDocument(value: unknown): value is BuilderDocument {
  if (!isRecord(value)) return false
  return value.version === 1
    && Array.isArray(value.content)
    && isRecord(value.root)
    && isMetadata(value.metadata)
}

export function validateBuilderComponents(
  document: BuilderDocument,
  componentIds: ReadonlySet<string>,
): { valid: true } | { valid: false; unknownTypes: string[] } {
  const unknownTypes: string[] = []
  const seen = new Set<string>()

  for (const entry of document.content) {
    if (!isRecord(entry) || typeof entry.type !== 'string') continue
    if (componentIds.has(entry.type) || seen.has(entry.type)) continue

    seen.add(entry.type)
    unknownTypes.push(entry.type)
  }

  return unknownTypes.length === 0
    ? { valid: true }
    : { valid: false, unknownTypes }
}

export function createBuilderDocument(
  data: Pick<BuilderDocument, 'content' | 'root'>,
  updatedAt = new Date().toISOString(),
): BuilderDocument {
  return {
    version: 1,
    content: data.content,
    root: data.root,
    metadata: {
      editor: 'puck',
      schemaVersion: 1,
      updatedAt,
    },
  }
}

export function serializeBuilderDocument(document: BuilderDocument): string {
  if (!isBuilderDocument(document)) {
    throw new Error('cannot serialize an invalid builder document')
  }

  return JSON.stringify(stableValue(document))
}

export function createEmptyBuilderDocument(): BuilderDocument {
  return {
    version: 1,
    content: [],
    root: {},
    metadata: {
      editor: 'puck',
      schemaVersion: 1,
    },
  }
}
