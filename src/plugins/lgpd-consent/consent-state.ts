export const CONSENT_COOKIE_NAME = 'np_lgpd_consent'

export const CONSENT_CATEGORIES = ['necessary', 'analytics', 'preferences', 'marketing'] as const

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number]

export type ConsentChoices = Record<ConsentCategory, boolean>

export interface ConsentCookie {
  policyVersion: string
  choices: ConsentChoices
  decidedAt: string
}

export const DEFAULT_CONSENT_CHOICES: ConsentChoices = {
  necessary: true,
  analytics: false,
  preferences: false,
  marketing: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeConsentChoices(value: unknown): ConsentChoices {
  const input = isRecord(value) ? value : {}
  return {
    necessary: true,
    analytics: input.analytics === true,
    preferences: input.preferences === true,
    marketing: input.marketing === true,
  }
}

export function serializeConsentCookie(cookie: ConsentCookie): string {
  return encodeURIComponent(JSON.stringify({
    policyVersion: cookie.policyVersion.trim().slice(0, 64),
    choices: normalizeConsentChoices(cookie.choices),
    decidedAt: cookie.decidedAt,
  }))
}

export function parseConsentCookie(value: string | null | undefined): ConsentCookie | undefined {
  if (!value) return undefined

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value))
    if (!isRecord(parsed)) return undefined

    const policyVersion = typeof parsed.policyVersion === 'string' ? parsed.policyVersion.trim() : ''
    const decidedAt = typeof parsed.decidedAt === 'string' ? parsed.decidedAt : ''
    if (!policyVersion || policyVersion.length > 64 || !decidedAt || Number.isNaN(Date.parse(decidedAt))) {
      return undefined
    }

    return {
      policyVersion,
      choices: normalizeConsentChoices(parsed.choices),
      decidedAt,
    }
  } catch {
    return undefined
  }
}

export function isConsentCurrent(cookie: ConsentCookie | undefined, policyVersion: string): boolean {
  return Boolean(cookie && cookie.policyVersion === policyVersion.trim())
}

export function isCategoryAllowed(cookie: ConsentCookie | undefined, category: ConsentCategory): boolean {
  return category === 'necessary' || cookie?.choices[category] === true
}
