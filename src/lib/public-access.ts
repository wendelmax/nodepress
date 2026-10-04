import { headers } from 'next/headers'
import { OptionService } from '@/services/option.service'
import { isMaintenanceBypassed } from '@/plugins/landing-pages/domain'

export interface PublicAccessInput {
  maintenance: boolean
  ip?: string
  allowlist?: readonly string[]
  previewValid?: boolean
}

export interface PublicAccessDecision {
  allowed: boolean
}

export function isLandingPagesActive(activePluginIds: readonly string[]): boolean {
  return activePluginIds.includes('landing-pages')
}

export function evaluatePublicAccess(pathname: string, input: PublicAccessInput): PublicAccessDecision {
  return {
    allowed: isMaintenanceBypassed(pathname, input),
  }
}

export function parseMaintenanceAllowlist(value?: string): string[] {
  if (!value) return []

  let entries: unknown = value
  try {
    entries = JSON.parse(value)
  } catch {
    entries = value.split(',')
  }

  const values = Array.isArray(entries) ? entries : [entries]
  return [...new Set(values
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry && entry !== '*' && !entry.includes('/')))]
}

export async function getPublicAccess(pathname: string, previewValid = false): Promise<PublicAccessDecision> {
  const options = await OptionService.getOptions([
    'landing_pages_maintenance',
    'landing_pages_allowlist',
  ])
  const requestHeaders = await headers()
  const forwardedIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedIp || requestHeaders.get('x-real-ip') || undefined

  return evaluatePublicAccess(pathname, {
    maintenance: ['1', 'true', 'on', 'yes'].includes(options.landing_pages_maintenance?.toLowerCase() ?? ''),
    ip,
    allowlist: parseMaintenanceAllowlist(options.landing_pages_allowlist),
    previewValid,
  })
}
