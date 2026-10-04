export type AuditMetadata = Record<string, unknown>

export interface AuditEvent {
  action: string
  resourceType: string
  resourceId?: string
  actorUserId?: number
  tenantId?: string
  success: boolean
  correlationId?: string
  ipSummary?: string
  metadata?: AuditMetadata
  occurredAt?: Date
}

export interface AuditQuery {
  page?: number
  pageSize?: number
  action?: string
  resourceType?: string
  resourceId?: string
  actorUserId?: number
  tenantId?: string
  success?: boolean
  from?: Date
  to?: Date
}

export interface AuditRequestContext {
  correlationId: string
  ipSummary?: string
}
