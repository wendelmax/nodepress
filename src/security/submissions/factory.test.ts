import { describe, expect, it } from 'vitest'
import { buildSubmissionSecurityConfig } from './factory'

describe('submission security factory', () => {
  it('uses safe defaults and normalizes configured policy values', () => {
    expect(buildSubmissionSecurityConfig({})).toEqual({
      consent: { required: false },
      rateLimit: { maxAttempts: 5, windowMs: 60_000 },
      captcha: { required: false },
    })

    expect(buildSubmissionSecurityConfig({
      forms_consent_required: 'true',
      forms_consent_policy_version: 'policy-v2',
      forms_rate_limit_attempts: '7',
      forms_rate_limit_window_ms: '120000',
      forms_captcha_required: 'true',
    })).toEqual({
      consent: { required: true, policyVersion: 'policy-v2' },
      rateLimit: { maxAttempts: 7, windowMs: 120_000 },
      captcha: { required: true },
    })
  })
})
