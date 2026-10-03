import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { AuditRequestContext } from './types'

const MAX_CORRELATION_ID_LENGTH = 128

export function summarizeIp(value: string | null | undefined): string | undefined {
  const candidate = value?.trim()
  if (!candidate || isIP(candidate) === 0) return undefined

  if (isIP(candidate) === 4) {
    const octets = candidate.split('.')
    return `${octets[0]}.${octets[1]}.${octets[2]}.0`
  }

  const groups = candidate.toLowerCase().split('::')[0].split(':').filter(Boolean).slice(0, 4)
  return groups.length > 0 ? `${groups.join(':')}::` : '::'
}

function resolveCorrelationId(request: Request): string {
  const header = request.headers.get('x-request-id')?.trim()
  if (header && header.length <= MAX_CORRELATION_ID_LENGTH) return header
  return randomUUID()
}

function resolveClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]
  return forwarded?.trim() || request.headers.get('x-real-ip') || undefined
}

export function resolveAuditRequestContext(request: Request): AuditRequestContext {
  return {
    correlationId: resolveCorrelationId(request),
    ipSummary: summarizeIp(resolveClientIp(request)),
  }
}
