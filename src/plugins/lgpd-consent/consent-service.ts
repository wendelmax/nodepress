import { normalizeConsentChoices, type ConsentChoices } from './consent-state'

export type ConsentDecision = 'save' | 'accept-all' | 'reject-all' | 'revoke'

export interface ConsentConfig {
  policyVersion: string
  policyUrl: string
  retentionDays: number
}

export interface ConsentEvent {
  policyVersion: string
  choices: ConsentChoices
  locale: string
  decision: ConsentDecision
  occurredAt: string
}

export const DEFAULT_CONSENT_CONFIG: ConsentConfig = {
  policyVersion: '1.0',
  policyUrl: '',
  retentionDays: 365,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePolicyUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  return url.startsWith('/') || /^https:\/\//i.test(url) ? url.slice(0, 500) : ''
}

function normalizePolicyVersion(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CONSENT_CONFIG.policyVersion
  const version = value.trim().slice(0, 64)
  return version || DEFAULT_CONSENT_CONFIG.policyVersion
}

export function normalizeConsentConfig(value: unknown): ConsentConfig {
  const input = isRecord(value) ? value : {}
  const retentionDays = typeof input.retentionDays === 'number' && Number.isFinite(input.retentionDays)
    ? Math.round(input.retentionDays)
    : DEFAULT_CONSENT_CONFIG.retentionDays

  return {
    policyVersion: normalizePolicyVersion(input.policyVersion),
    policyUrl: normalizePolicyUrl(input.policyUrl),
    retentionDays: Math.min(3650, Math.max(30, retentionDays)),
  }
}

export function buildConsentEvent(
  input: { choices: unknown; locale: unknown; decision: unknown; policyVersion?: unknown },
  config: ConsentConfig,
  now = new Date(),
): ConsentEvent {
  const decision: ConsentDecision = input.decision === 'accept-all'
    || input.decision === 'reject-all'
    || input.decision === 'revoke'
    ? input.decision
    : 'save'

  const locale = typeof input.locale === 'string' && input.locale.trim()
    ? input.locale.trim().slice(0, 16)
    : 'pt-BR'

  return {
    policyVersion: config.policyVersion,
    choices: normalizeConsentChoices(input.choices),
    locale,
    decision,
    occurredAt: now.toISOString(),
  }
}
