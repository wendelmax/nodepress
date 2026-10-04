import { describe, expect, it } from 'vitest'
import { buildConsentEvent, DEFAULT_CONSENT_CONFIG, normalizeConsentConfig } from './consent-service'

describe('LGPD consent service contracts', () => {
  it('normalizes policy and retention settings to safe values', () => {
    expect(normalizeConsentConfig({
      policyVersion: ' 2026.10 ',
      policyUrl: 'javascript:alert(1)',
      retentionDays: 0,
    })).toEqual({
      policyVersion: '2026.10',
      policyUrl: '',
      retentionDays: 30,
    })
  })

  it('builds a versioned minimal event from client categories', () => {
    const event = buildConsentEvent({
      policyVersion: 'client-attempted-version',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
      locale: 'pt-BR',
      decision: 'save',
    }, {
      ...DEFAULT_CONSENT_CONFIG,
      policyVersion: 'server-policy-v2',
    }, new Date('2026-10-04T02:00:00.000Z'))

    expect(event).toEqual({
      policyVersion: 'server-policy-v2',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
      locale: 'pt-BR',
      decision: 'save',
      occurredAt: '2026-10-04T02:00:00.000Z',
    })
    expect(event).not.toHaveProperty('ip')
    expect(event).not.toHaveProperty('userAgent')
    expect(event).not.toHaveProperty('path')
    expect(event).not.toHaveProperty('visitorId')
  })
})
