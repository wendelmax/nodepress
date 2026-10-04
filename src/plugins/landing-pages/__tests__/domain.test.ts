import { describe, expect, it } from 'vitest'
import {
  createPreviewToken,
  isLandingPagePublished,
  isMaintenanceBypassed,
  verifyPreviewToken,
} from '../domain'

const now = new Date('2026-09-27T12:00:00.000Z')

describe('landing page publication rules', () => {
  it('publishes immediately when status is publish and no schedule exists', () => {
    expect(isLandingPagePublished({ status: 'publish' }, now)).toBe(true)
  })

  it('does not publish before the scheduled instant or with an invalid timezone', () => {
    expect(isLandingPagePublished({
      status: 'publish',
      publishAt: '2026-09-27T13:00:00.000Z',
      timezone: 'America/Sao_Paulo',
    }, now)).toBe(false)

    expect(isLandingPagePublished({
      status: 'publish',
      publishAt: '2026-09-27T11:00:00.000Z',
      timezone: 'Invalid/Timezone',
    }, now)).toBe(false)
  })
})

describe('landing page preview tokens', () => {
  it('creates and verifies a short-lived token', () => {
    const token = createPreviewToken('landing-1', 'secret', now, 600)

    expect(verifyPreviewToken(token, 'secret', now)).toEqual({
      landingPageId: 'landing-1',
      expiresAt: '2026-09-27T12:10:00.000Z',
    })
  })

  it('rejects tampering, a wrong secret and expiration', () => {
    const token = createPreviewToken('landing-1', 'secret', now, 1)
    const [payload, signature] = token.split('.')
    const tampered = `${payload}.${signature.slice(0, -1)}0`

    expect(verifyPreviewToken(tampered, 'secret', now)).toBeNull()
    expect(verifyPreviewToken(token, 'wrong-secret', now)).toBeNull()
    expect(verifyPreviewToken(token, 'secret', new Date('2026-09-27T12:00:02.000Z'))).toBeNull()
  })
})

describe('maintenance bypass', () => {
  it.each(['/login', '/login/reset', '/admin', '/admin/posts', '/api', '/api/auth/session', '/setup-config'])
    ('always allows protected route %s', (pathname) => {
      expect(isMaintenanceBypassed(pathname, { maintenance: true })).toBe(true)
    })

  it('allows an exact allowlisted IP and a valid preview, but not an arbitrary IP', () => {
    expect(isMaintenanceBypassed('/', {
      maintenance: true,
      ip: '203.0.113.10',
      allowlist: ['203.0.113.10'],
    })).toBe(true)

    expect(isMaintenanceBypassed('/', {
      maintenance: true,
      ip: '203.0.113.100',
      allowlist: ['203.0.113.10'],
    })).toBe(false)

    expect(isMaintenanceBypassed('/campaign', {
      maintenance: true,
      previewValid: true,
    })).toBe(true)
  })

  it('does not bypass a normal public path when maintenance is disabled', () => {
    expect(isMaintenanceBypassed('/', { maintenance: false })).toBe(true)
  })
})
