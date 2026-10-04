import { describe, expect, it } from 'vitest'
import { serializeConsentCookie, DEFAULT_CONSENT_CHOICES } from './consent-state'
import { hasAnalyticsConsent } from './proxy-consent'

describe('proxy analytics consent gate', () => {
  it('fails closed on first visit, malformed cookies and rejection', () => {
    expect(hasAnalyticsConsent(null)).toBe(false)
    expect(hasAnalyticsConsent('np_lgpd_consent=%7Bbad')).toBe(false)
    expect(hasAnalyticsConsent(`np_lgpd_consent=${serializeConsentCookie({ policyVersion: '1', choices: DEFAULT_CONSENT_CHOICES, decidedAt: '2026-10-04T00:00:00.000Z' })}`)).toBe(false)
  })

  it('allows internal analytics only after analytics is explicitly accepted', () => {
    const cookie = serializeConsentCookie({
      policyVersion: '1',
      choices: { ...DEFAULT_CONSENT_CHOICES, analytics: true },
      decidedAt: '2026-10-04T00:00:00.000Z',
    })

    expect(hasAnalyticsConsent(`other=1; np_lgpd_consent=${cookie}; session=2`)).toBe(true)
  })
})
