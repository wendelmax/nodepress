import { describe, expect, it } from 'vitest'
import { resolveAuditRequestContext, summarizeIp } from '@/audit/context'

describe('audit request context', () => {
  it('summarizes IPv4 and IPv6 addresses', () => {
    expect(summarizeIp('192.168.10.42')).toBe('192.168.10.0')
    expect(summarizeIp('2001:db8:abcd:1234::1')).toBe('2001:db8:abcd:1234::')
    expect(summarizeIp('not-an-ip')).toBeUndefined()
  })

  it('uses the first forwarded IP and preserves a valid request id', () => {
    const request = new Request('https://nodepress.test/api/posts', {
      headers: {
        'x-forwarded-for': '203.0.113.9, 10.0.0.1',
        'x-request-id': 'request-123',
      },
    })

    expect(resolveAuditRequestContext(request)).toEqual({
      correlationId: 'request-123',
      ipSummary: '203.0.113.0',
    })
  })

  it('generates a correlation id when the header is absent', () => {
    const context = resolveAuditRequestContext(new Request('https://nodepress.test'))

    expect(context.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(context.ipSummary).toBeUndefined()
  })
})
