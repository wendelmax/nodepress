import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONSENT_CHOICES,
  isCategoryAllowed,
  isConsentCurrent,
  normalizeConsentChoices,
  parseConsentCookie,
  serializeConsentCookie,
} from './consent-state'

describe('LGPD consent state', () => {
  it('starts a first visit with necessary only and no parsed decision', () => {
    expect(parseConsentCookie(null)).toBeUndefined()
    expect(DEFAULT_CONSENT_CHOICES).toEqual({
      necessary: true,
      analytics: false,
      preferences: false,
      marketing: false,
    })
  })

  it('rejects optional categories while keeping necessary consent enabled', () => {
    expect(normalizeConsentChoices({ necessary: false, analytics: false, preferences: false, marketing: false })).toEqual(
      DEFAULT_CONSENT_CHOICES,
    )
  })

  it('round-trips a granular partial acceptance', () => {
    const cookie = serializeConsentCookie({
      policyVersion: '2026-10-04',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
      decidedAt: '2026-10-04T02:00:00.000Z',
    })

    expect(parseConsentCookie(cookie)).toEqual({
      policyVersion: '2026-10-04',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
      decidedAt: '2026-10-04T02:00:00.000Z',
    })
  })

  it('fails closed for malformed cookies and stale policy versions', () => {
    expect(parseConsentCookie('%7Bnot-json')).toBeUndefined()
    const cookie = parseConsentCookie(serializeConsentCookie({
      policyVersion: '1',
      choices: DEFAULT_CONSENT_CHOICES,
      decidedAt: '2026-10-04T02:00:00.000Z',
    }))!

    expect(isConsentCurrent(cookie, '2')).toBe(false)
    expect(isCategoryAllowed(cookie, 'analytics')).toBe(false)
  })
})
