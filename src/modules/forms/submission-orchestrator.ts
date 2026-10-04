import type {
  SubmissionSecurityInput,
  SubmissionSecurityPolicy,
  SubmissionSecurityResult,
} from '@/security/submissions/contracts'
import type {
  Lead,
  LeadEvent,
  SubmissionInput,
} from '@/modules/leads'
import type { FormService } from './service'
import type { FormSubmission, FormSubmissionInput } from './types'

export interface FormSubmissionOrchestratorInput extends FormSubmissionInput {
  formId: string
  security: SubmissionSecurityInput
  idempotencyKey?: string
}

export interface FormSubmissionLeadPort {
  createFromSubmission(input: SubmissionInput): Promise<{
    lead: Lead
    event?: LeadEvent
    created: boolean
  }>
}

export interface FormSubmissionDeliveryPort {
  enqueue(event: LeadEvent): Promise<{ status: 'delivered' | 'pending' }>
}

export interface FormSubmissionIdempotencyPort {
  get(formId: string, key: string): Promise<FormSubmissionOrchestratedResult | undefined>
  set(formId: string, key: string, result: FormSubmissionOrchestratedResult): Promise<void>
}

export interface FormSubmissionOrchestratorDependencies {
  forms: Pick<FormService, 'submit'>
  security: {
    protect(input: SubmissionSecurityInput, policy: SubmissionSecurityPolicy): Promise<SubmissionSecurityResult>
  }
  securityPolicy: SubmissionSecurityPolicy
  leads: FormSubmissionLeadPort
  delivery: FormSubmissionDeliveryPort
  idempotency?: FormSubmissionIdempotencyPort
}

export type FormSubmissionOrchestratedResult =
  | {
      outcome: 'accepted' | 'deliveryPending'
      submission: FormSubmission
      leadId: string
      deliveryStatus: 'delivered' | 'pending'
    }
  | {
      outcome: 'securityFailure'
      security: Extract<SubmissionSecurityResult, { allowed: false }>
    }

export type FormSubmissionOrchestratorResult =
  | FormSubmissionOrchestratedResult
  | { outcome: 'duplicate'; original: FormSubmissionOrchestratedResult }

export class FormSubmissionOrchestrator {
  constructor(private readonly dependencies: FormSubmissionOrchestratorDependencies) {}

  async submit(input: FormSubmissionOrchestratorInput): Promise<FormSubmissionOrchestratorResult> {
    const key = input.idempotencyKey?.trim()
    if (key && this.dependencies.idempotency) {
      const existing = await this.dependencies.idempotency.get(input.formId, key)
      if (existing) return { outcome: 'duplicate', original: existing }
    }

    const security = await this.dependencies.security.protect(input.security, this.dependencies.securityPolicy)
    if (!security.allowed) return { outcome: 'securityFailure', security }

    const submission = await this.dependencies.forms.submit(input.formId, {
      values: input.values,
      ...(input.uploads ? { uploads: input.uploads } : {}),
    })
    const leadResult = await this.dependencies.leads.createFromSubmission({
      id: submission.id,
      formId: submission.formId,
      data: submission.payload,
      occurredAt: submission.createdAt,
    })

    const deliveryStatus = leadResult.event
      ? (await this.dependencies.delivery.enqueue(leadResult.event)).status
      : 'delivered'
    const result: FormSubmissionOrchestratedResult = {
      outcome: deliveryStatus === 'pending' ? 'deliveryPending' : 'accepted',
      submission,
      leadId: leadResult.lead.id,
      deliveryStatus,
    }

    if (key && this.dependencies.idempotency) {
      await this.dependencies.idempotency.set(input.formId, key, result)
    }
    return result
  }
}
