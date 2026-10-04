import { randomUUID } from 'node:crypto'
import { canTransitionLead } from './lead-state'
import {
  InvalidLeadTransitionError,
  LeadNotFoundError,
  type Lead,
  type LeadEvent,
  type LeadEventPublisherPort,
  type LeadPipelineDependencies,
  type LeadStatus,
  type SubmissionInput,
} from './contracts'

export interface CreateLeadResult {
  lead: Lead
  event?: LeadEvent
  created: boolean
}

export interface TransitionLeadResult {
  lead: Lead
  event: LeadEvent
}

export class LeadPipelineService {
  private readonly publisher: LeadEventPublisherPort
  private readonly idGenerator: () => string
  private readonly eventIdGenerator: () => string
  private readonly now: () => Date

  constructor(private readonly dependencies: LeadPipelineDependencies) {
    this.publisher = dependencies.publisher ?? { publish: async () => {} }
    this.idGenerator = dependencies.idGenerator ?? randomUUID
    this.eventIdGenerator = dependencies.eventIdGenerator ?? randomUUID
    this.now = dependencies.now ?? (() => new Date())
  }

  async createFromSubmission(input: SubmissionInput): Promise<CreateLeadResult> {
    const sourceSubmissionId = String(input.id)
    const existing = await this.dependencies.repository.findBySourceSubmissionId(sourceSubmissionId)
    if (existing) return { lead: existing, created: false }

    const occurredAt = input.occurredAt ?? this.now()
    const lead: Lead = {
      id: this.idGenerator(),
      sourceSubmissionId,
      sourceFormId: input.formId,
      formSlug: input.formSlug,
      data: clone(input.data),
      status: 'new',
      version: 1,
      createdAt: new Date(occurredAt),
      updatedAt: new Date(occurredAt),
    }
    await this.dependencies.repository.save(lead)

    const event = this.createEvent('lead.created', lead)
    await this.publisher.publish(event)
    return { lead: clone(lead), event, created: true }
  }

  async transition(leadId: string, status: LeadStatus): Promise<TransitionLeadResult> {
    const current = await this.dependencies.repository.findById(leadId)
    if (!current) throw new LeadNotFoundError(leadId)
    if (!canTransitionLead(current.status, status)) {
      throw new InvalidLeadTransitionError(current.status, status)
    }

    const lead: Lead = {
      ...current,
      status,
      version: current.version + 1,
      updatedAt: this.now(),
      data: clone(current.data),
    }
    await this.dependencies.repository.save(lead)

    const event = this.createEvent('lead.updated', lead)
    await this.publisher.publish(event)
    return { lead: clone(lead), event }
  }

  async list(): Promise<Lead[]> {
    return this.dependencies.repository.list()
  }

  private createEvent(type: LeadEvent['type'], lead: Lead): LeadEvent {
    return {
      id: this.eventIdGenerator(),
      type,
      sequence: lead.version,
      lead: clone(lead),
      occurredAt: new Date(lead.updatedAt),
    }
  }
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : value
}
