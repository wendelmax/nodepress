import type {
  CaptchaVerifier,
  RateLimitDecision,
  SubmissionSecurityFailure,
  SubmissionSecurityInput,
  SubmissionSecurityPolicy,
  SubmissionSecurityResult,
  SubmissionRateLimitKey,
  SubmissionRateLimiter,
} from './contracts'

const SUCCESS: SubmissionSecurityResult = {
  allowed: true,
  code: 'ALLOWED',
  message: 'Submission accepted.',
}

function failure(code: SubmissionSecurityFailure['code'], message: string, retryAfterSeconds?: number): SubmissionSecurityFailure {
  return retryAfterSeconds === undefined
    ? { allowed: false, code, message }
    : { allowed: false, code, message, retryAfterSeconds }
}

function isFilledHoneypot(value: unknown): boolean {
  if (value === undefined || value === null) return false
  return typeof value === 'string' ? value.trim().length > 0 : true
}

function isUsableKey(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function buildRateLimitKeys(input: SubmissionSecurityInput): SubmissionRateLimitKey[] {
  const keys: SubmissionRateLimitKey[] = [{ scope: 'origin', value: input.originKey }]
  if (input.identityKey && input.identityKey.trim()) {
    keys.push({ scope: 'identity', value: input.identityKey })
  }
  return keys
}

export interface SubmissionSecurityServiceOptions {
  rateLimiter: SubmissionRateLimiter
  captchaVerifier?: CaptchaVerifier
}

export class SubmissionSecurityService {
  private readonly rateLimiter: SubmissionRateLimiter
  private readonly captchaVerifier?: CaptchaVerifier

  constructor(options: SubmissionSecurityServiceOptions) {
    this.rateLimiter = options.rateLimiter
    this.captchaVerifier = options.captchaVerifier
  }

  async protect(
    input: SubmissionSecurityInput,
    policy: SubmissionSecurityPolicy,
  ): Promise<SubmissionSecurityResult> {
    if (!isUsableKey(input.originKey)) {
      return failure('SECURITY_UNAVAILABLE', 'Submission security is temporarily unavailable. Please try again later.')
    }

    if (isFilledHoneypot(input.honeypotValue)) {
      return failure('SUBMISSION_REJECTED', 'Unable to process this submission.')
    }

    if (policy.consent.required) {
      const consentMatchesVersion = !policy.consent.policyVersion
        || input.consent?.policyVersion === policy.consent.policyVersion
      if (input.consent?.accepted !== true || !consentMatchesVersion) {
        return failure('CONSENT_REQUIRED', 'Please review and accept the required consent before submitting.')
      }
    }

    let rateLimit: RateLimitDecision
    try {
      rateLimit = await this.rateLimiter.consume(buildRateLimitKeys(input), policy.rateLimit)
    } catch {
      return failure('SECURITY_UNAVAILABLE', 'Submission security is temporarily unavailable. Please try again later.')
    }

    if (!rateLimit.allowed) {
      return failure('RATE_LIMITED', 'Too many submissions. Please try again later.', rateLimit.retryAfterSeconds)
    }

    if (policy.captcha.required) {
      if (!this.captchaVerifier || typeof input.captchaToken !== 'string' || !input.captchaToken.trim()) {
        return failure('CAPTCHA_REQUIRED', 'Please complete the verification and try again.')
      }

      try {
        const verification = await this.captchaVerifier.verify({ token: input.captchaToken })
        if (!verification.valid) {
          return failure('CAPTCHA_INVALID', 'Please complete the verification and try again.')
        }
      } catch {
        return failure('SECURITY_UNAVAILABLE', 'Submission security is temporarily unavailable. Please try again later.')
      }
    }

    return SUCCESS
  }
}

