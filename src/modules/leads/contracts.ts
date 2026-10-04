export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export interface SubmissionInput {
  id: string | number
  formId: string
  formSlug?: string
  data: Record<string, unknown>
  occurredAt?: Date
}

export interface Lead {
  id: string
  sourceSubmissionId: string
  sourceFormId: string
  formSlug?: string
  data: Record<string, unknown>
  status: LeadStatus
  version: number
  createdAt: Date
  updatedAt: Date
}

export type LeadEventType = 'lead.created' | 'lead.updated'

export interface LeadEvent {
  id: string
  type: LeadEventType
  sequence: number
  lead: Lead
  occurredAt: Date
}

export interface LeadRepositoryPort {
  findById(id: string): Promise<Lead | undefined>
  findBySourceSubmissionId(sourceSubmissionId: string): Promise<Lead | undefined>
  save(lead: Lead): Promise<void>
  list(): Promise<Lead[]>
}

export interface LeadEventPublisherPort {
  publish(event: LeadEvent): Promise<void>
}

export interface LeadPipelineDependencies {
  repository: LeadRepositoryPort
  publisher?: LeadEventPublisherPort
  idGenerator?: () => string
  eventIdGenerator?: () => string
  now?: () => Date
}

export class LeadNotFoundError extends Error {
  readonly code = 'LEAD_NOT_FOUND'

  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`)
    this.name = 'LeadNotFoundError'
  }
}

export class InvalidLeadTransitionError extends Error {
  readonly code = 'INVALID_LEAD_TRANSITION'

  constructor(from: LeadStatus, to: LeadStatus) {
    super(`Invalid lead transition: ${from} -> ${to}`)
    this.name = 'InvalidLeadTransitionError'
  }
}
