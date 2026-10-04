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

  const publishAt = parsePublicationInstant(record.publishAt, record.timezone)
  return publishAt !== null && publishAt.getTime() <= now.getTime()
}

export function parsePublicationInstant(value: string, timezone: string): Date | null {
  if (!isValidTimezone(timezone)) return null

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const instant = new Date(value)
    return Number.isNaN(instant.getTime()) ? null : instant
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(value)
  if (!match) return null

  const [, year, month, day, hour = '00', minute = '00', second = '00', milliseconds = '0'] = match
  const wallClock = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds.padEnd(3, '0')),
  )
  if (!isSameUtcCalendar(wallClock, Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second))) {
    return null
  }

  let instant = wallClock
  for (let attempt = 0; attempt < 3; attempt += 1) {
    instant = wallClock - getTimezoneOffsetMs(new Date(instant), timezone)
  }

  const resolved = new Date(instant)
  return hasSameWallClock(resolved, timezone, {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }) ? resolved : null
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

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)])) as Record<string, number>
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime()
}

function hasSameWallClock(
  date: Date,
  timezone: string,
  expected: { year: number; month: number; day: number; hour: number; minute: number; second: number },
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)])) as Record<string, number>
  return values.year === expected.year
    && values.month === expected.month
    && values.day === expected.day
    && values.hour === expected.hour
    && values.minute === expected.minute
    && values.second === expected.second
}

function isSameUtcCalendar(
  value: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean {
  const date = new Date(value)
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second
}
