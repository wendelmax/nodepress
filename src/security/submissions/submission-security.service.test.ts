import { describe, expect, it } from 'vitest'
import { SubmissionSecurityService } from './submission-security.service'
import type {
  CaptchaVerifier,
  RateLimitDecision,
  SubmissionSecurityPolicy,
  SubmissionSecurityInput,
  SubmissionRateLimiter,
  SubmissionRateLimitKey,
} from './contracts'

const policy: SubmissionSecurityPolicy = {
  consent: { required: true, policyVersion: 'policy-v1' },
  rateLimit: { maxAttempts: 3, windowMs: 60_000 },
  captcha: { required: false },
}

const allowRateLimiter: SubmissionRateLimiter = {
  async consume(_keys: readonly SubmissionRateLimitKey[]): Promise<RateLimitDecision> {
    return { allowed: true, retryAfterSeconds: 0 }
  },
}

const validCaptcha: CaptchaVerifier = {
  async verify() {
    return { valid: true }
  },
}

const validInput: SubmissionSecurityInput = {
  originKey: 'origin-key',
  identityKey: 'identity-key',
  consent: { accepted: true, policyVersion: 'policy-v1' },
  captchaToken: 'captcha-token',
}

describe('SubmissionSecurityService', () => {
  it('allows a legitimate submission after all required checks pass', async () => {
    const service = new SubmissionSecurityService({ rateLimiter: allowRateLimiter, captchaVerifier: validCaptcha })

    await expect(service.protect(validInput, policy)).resolves.toEqual({
      allowed: true,
      code: 'ALLOWED',
      message: 'Submission accepted.',
    })
  })

  it('rejects a filled honeypot without calling other security ports', async () => {
    let rateLimitCalls = 0
    const service = new SubmissionSecurityService({
      rateLimiter: {
        async consume() {
          rateLimitCalls += 1
          return { allowed: true, retryAfterSeconds: 0 }
        },
      },
      captchaVerifier: validCaptcha,
    })

    const result = await service.protect({ ...validInput, honeypotValue: 'bot value' }, policy)

    expect(result).toEqual({
      allowed: false,
      code: 'SUBMISSION_REJECTED',
      message: 'Unable to process this submission.',
    })
    expect(rateLimitCalls).toBe(0)
  })

  it('rejects missing consent with an actionable public message', async () => {
    const service = new SubmissionSecurityService({ rateLimiter: allowRateLimiter })

    await expect(service.protect({ ...validInput, consent: undefined }, policy)).resolves.toEqual({
      allowed: false,
      code: 'CONSENT_REQUIRED',
      message: 'Please review and accept the required consent before submitting.',
    })
  })

  it('rejects consent from a different policy version', async () => {
    const service = new SubmissionSecurityService({ rateLimiter: allowRateLimiter })

    await expect(service.protect({
      ...validInput,
      consent: { accepted: true, policyVersion: 'old-policy' },
    }, policy)).resolves.toMatchObject({
      allowed: false,
      code: 'CONSENT_REQUIRED',
    })
  })

  it('does not expose secrets, tokens, origin, identity, or provider details in failures', async () => {
    const service = new SubmissionSecurityService({
      rateLimiter: {
        async consume() {
          return { allowed: false, retryAfterSeconds: 11 }
        },
      },
      captchaVerifier: validCaptcha,
    })

    const result = await service.protect(validInput, policy)

    expect(result).toEqual({
      allowed: false,
      code: 'RATE_LIMITED',
      message: 'Too many submissions. Please try again later.',
      retryAfterSeconds: 11,
    })
    expect(JSON.stringify(result)).not.toContain('captcha-token')
    expect(JSON.stringify(result)).not.toContain('origin-key')
    expect(JSON.stringify(result)).not.toContain('identity-key')
  })
})
