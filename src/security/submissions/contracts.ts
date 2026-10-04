export type SubmissionFailureCode =
  | 'SUBMISSION_REJECTED'
  | 'RATE_LIMITED'
  | 'CONSENT_REQUIRED'
  | 'CAPTCHA_REQUIRED'
  | 'CAPTCHA_INVALID'
  | 'SECURITY_UNAVAILABLE'

export interface SubmissionSecurityInput {
  originKey: string
  identityKey?: string
  honeypotValue?: unknown
  consent?: {
    accepted: boolean
    policyVersion?: string
  }
  captchaToken?: string
}

export interface SubmissionSecurityPolicy {
  consent: {
    required: boolean
    policyVersion?: string
  }
  rateLimit: RateLimitPolicy
  captcha: {
    required: boolean
  }
}

export interface RateLimitPolicy {
  maxAttempts: number
  windowMs: number
}

export interface SubmissionRateLimitKey {
  scope: 'origin' | 'identity'
  value: string
}

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
}

export interface SubmissionRateLimiter {
  consume(
    keys: readonly SubmissionRateLimitKey[],
    policy: RateLimitPolicy,
  ): Promise<RateLimitDecision>
}

export interface CaptchaVerificationInput {
  token: string
}

export interface CaptchaVerificationResult {
  valid: boolean
}

export interface CaptchaVerifier {
  verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult>
}

export interface SubmissionSecuritySuccess {
  allowed: true
  code: 'ALLOWED'
  message: 'Submission accepted.'
}

export interface SubmissionSecurityFailure {
  allowed: false
  code: SubmissionFailureCode
  message: string
  retryAfterSeconds?: number
}

export type SubmissionSecurityResult = SubmissionSecuritySuccess | SubmissionSecurityFailure
