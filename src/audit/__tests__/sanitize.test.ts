import { describe, expect, it } from 'vitest'
import { sanitizeAuditMetadata } from '@/audit/sanitize'

describe('sanitizeAuditMetadata', () => {
  it('redacts sensitive keys recursively without changing safe values', () => {
    const result = sanitizeAuditMetadata({
      action: 'post.created',
      Password: 'secret',
      nested: {
        apiKey: 'key',
        safe: 'value',
        entries: [{ userPass: 'hash', count: 2 }],
      },
    })

    expect(result).toEqual({
      action: 'post.created',
      Password: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        safe: 'value',
        entries: [{ userPass: '[REDACTED]', count: 2 }],
      },
    })
  })

  it('bounds long strings and large collections', () => {
    const result = sanitizeAuditMetadata({
      long: 'x'.repeat(2_000),
      values: Array.from({ length: 100 }, (_, index) => index),
    }) as { long: string; values: unknown[] }

    expect(result.long).toBe('[TRUNCATED]')
    expect(result.values).toHaveLength(50)
  })
})
