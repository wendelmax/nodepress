import {
  CONSENT_COOKIE_NAME,
  isCategoryAllowed,
  parseConsentCookie,
} from './consent-state'

/**
 * Edge-safe, fail-closed check used before forwarding analytics events.
 * The proxy receives the raw Cookie header rather than a decoded cookie value.
 */
export function hasAnalyticsConsent(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue

    const name = part.slice(0, separator).trim()
    if (name !== CONSENT_COOKIE_NAME) continue

    const value = part.slice(separator + 1).trim()
    const cookie = parseConsentCookie(value)
    return isCategoryAllowed(cookie, 'analytics') && cookie?.choices.analytics === true
  }

  return false
}
