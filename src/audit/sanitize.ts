const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'accesskey',
  'privatekey',
  'userpass',
])

const MAX_STRING_LENGTH = 512
const MAX_COLLECTION_ITEMS = 50

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.replace(/[^a-z0-9]/gi, '').toLowerCase())
}

function sanitize(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? '[TRUNCATED]' : value
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'object') return String(value)

  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (Array.isArray(value)) {
    const result = value.slice(0, MAX_COLLECTION_ITEMS).map((item) => sanitize(item, seen))
    seen.delete(value)
    return result
  }

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value).slice(0, MAX_COLLECTION_ITEMS)) {
    result[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitize(item, seen)
  }
  seen.delete(value)
  return result
}

export function sanitizeAuditMetadata(value: unknown): unknown {
  return sanitize(value, new WeakSet<object>())
}
