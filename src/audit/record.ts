import { auditLogService } from './service'
import { resolveAuditRequestContext } from './context'
import type { AuditEvent } from './types'

export type AuditEventInput = Omit<AuditEvent, 'correlationId' | 'ipSummary'> & Partial<Pick<AuditEvent, 'correlationId' | 'ipSummary'>>

export function recordAuditEvent(request: Request | undefined, event: AuditEventInput): void {
  const context = request ? resolveAuditRequestContext(request) : {}
  void auditLogService.record({ ...event, ...context })
}
