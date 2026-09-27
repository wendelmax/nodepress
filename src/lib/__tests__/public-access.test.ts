import { describe, expect, it } from 'vitest'
import { evaluatePublicAccess, parseMaintenanceAllowlist } from '../public-access'

describe('public access policy', () => {
  it('keeps administrative and authentication paths available during maintenance', () => {
    for (const pathname of ['/login', '/admin/posts', '/api/health', '/setup-config']) {
      expect(evaluatePublicAccess(pathname, { maintenance: true })).toEqual({ allowed: true })
    }
  })

  it('blocks public paths unless the IP or preview is allowed', () => {
    expect(evaluatePublicAccess('/', { maintenance: true })).toEqual({ allowed: false })
    expect(evaluatePublicAccess('/', {
      maintenance: true,
      ip: '203.0.113.7',
      allowlist: ['203.0.113.7'],
    })).toEqual({ allowed: true })
    expect(evaluatePublicAccess('/campaign', { maintenance: true, previewValid: true })).toEqual({ allowed: true })
  })

  it('normalizes a JSON or comma-separated allowlist without wildcard entries', () => {
    expect(parseMaintenanceAllowlist('["203.0.113.7", " 198.51.100.4 "]')).toEqual([
      '203.0.113.7',
      '198.51.100.4',
    ])
    expect(parseMaintenanceAllowlist('203.0.113.7,198.51.100.4,*')).toEqual([
      '203.0.113.7',
      '198.51.100.4',
    ])
  })
})
