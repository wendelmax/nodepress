import { createHmac, timingSafeEqual } from 'node:crypto'

export interface LandingPagePublicationRecord {
  status: string
  publishAt?: string | null
  timezone?: string | null
}

export interface PreviewTokenPayload {
  landingPageId: string
  expiresAt: string
}

export interface MaintenanceBypassInput {
  maintenance?: boolean
  ip?: string | null
  allowlist?: readonly string[]
  previewValid?: boolean
}

const PROTECTED_PREFIXES = ['/login', '/admin', '/api', '/setup-config']

export function isLandingPagePublished(
  record: LandingPagePublicationRecord,
  now = new Date(),
): boolean {
  if (record.status !== 'publish') return false
  if (!record.publishAt) return true
  if (!record.timezone || !isValidTimezone(record.timezone)) return false

  const publishAt = new Date(record.publishAt)
  return !Number.isNaN(publishAt.getTime()) && publishAt.getTime() <= now.getTime()
}

export function createPreviewToken(
  landingPageId: string,
  secret: string,
  now = new Date(),
  ttlSeconds = 600,
): string {
  if (!landingPageId.trim()) throw new Error('Landing page id is required')
  if (!secret) throw new Error('Preview secret is required')
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error('Preview TTL must be positive')

  const payload: PreviewTokenPayload = {
    landingPageId,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  return `${encodedPayload}.${sign(encodedPayload, secret)}`
}

export function verifyPreviewToken(
  token: string,
  secret: string,
  now = new Date(),
): PreviewTokenPayload | null {
  if (!token || !secret) return null

  const [encodedPayload, encodedSignature, ...extra] = token.split('.')
  if (!encodedPayload || !encodedSignature || extra.length > 0) return null

  const expectedSignature = sign(encodedPayload, secret)
  const received = Buffer.from(encodedSignature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<PreviewTokenPayload>
    if (typeof payload.landingPageId !== 'string' || !payload.landingPageId.trim()) return null
    if (typeof payload.expiresAt !== 'string') return null

    const expiresAt = new Date(payload.expiresAt)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) return null

    return {
      landingPageId: payload.landingPageId,
      expiresAt: expiresAt.toISOString(),
    }
  } catch {
    return null
  }
}

export function isMaintenanceBypassed(pathname: string, input: MaintenanceBypassInput): boolean {
  if (!input.maintenance) return true
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true
  if (input.previewValid) return true

  const ip = input.ip?.trim()
  return Boolean(ip && (input.allowlist ?? []).some((allowedIp) => allowedIp.trim() === ip))
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}
