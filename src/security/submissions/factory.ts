import { OptionService } from '@/services/option.service'
import { InMemorySubmissionRateLimiter } from './in-memory-rate-limiter'
import { SubmissionSecurityService } from './submission-security.service'
import type { RateLimitPolicy, SubmissionSecurityPolicy } from './contracts'

export interface SubmissionSecurityRuntime {
  service: SubmissionSecurityService
  policy: SubmissionSecurityPolicy
}

export function buildSubmissionSecurityConfig(options: Record<string, string | undefined>): SubmissionSecurityPolicy {
  const rateLimit: RateLimitPolicy = {
    maxAttempts: positiveInteger(options.forms_rate_limit_attempts, 5),
    windowMs: positiveInteger(options.forms_rate_limit_window_ms, 60_000),
  }
  const consentRequired = options.forms_consent_required === 'true'
  const policyVersion = options.forms_consent_policy_version?.trim()

  return {
    consent: {
      required: consentRequired,
      ...(policyVersion ? { policyVersion } : {}),
    },
    rateLimit,
    captcha: { required: options.forms_captcha_required === 'true' },
  }
}

export async function createSubmissionSecurityRuntime(): Promise<SubmissionSecurityRuntime> {
  const options = await OptionService.getOptions([
    'forms_consent_required',
    'forms_consent_policy_version',
    'forms_rate_limit_attempts',
    'forms_rate_limit_window_ms',
    'forms_captcha_required',
  ])
  const policy = buildSubmissionSecurityConfig(options)
  return {
    policy,
    service: new SubmissionSecurityService({
      rateLimiter: new InMemorySubmissionRateLimiter(),
    }),
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
