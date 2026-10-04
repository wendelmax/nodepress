import { describe, expect, it } from 'vitest'
import { FormSubmissionOrchestrator, type FormSubmissionOrchestratorDependencies } from '../submission-orchestrator'
import type { FormSubmission } from '../types'
import type { SubmissionSecurityResult } from '@/security/submissions/contracts'
import type { LeadEvent, Lead } from '@/modules/leads'

const submission: FormSubmission = {
  id: 'submission-1',
  formId: 'contact',
  payload: { email: 'ada@example.test' },
  createdAt: new Date('2026-10-04T12:00:00.000Z'),
}

const lead: Lead = {
  id: 'lead-1',
  sourceSubmissionId: submission.id,
  sourceFormId: submission.formId,
  data: submission.payload,
  status: 'new',
  version: 1,
  createdAt: submission.createdAt,
  updatedAt: submission.createdAt,
}

const event: LeadEvent = {
  id: 'event-1',
  type: 'lead.created',
  sequence: 1,
  lead,
  occurredAt: submission.createdAt,
}

function createDependencies(overrides: Partial<FormSubmissionOrchestratorDependencies> = {}) {
  let submitCalls = 0
  const stored = new Map<string, ReturnType<FormSubmissionOrchestrator['submit']> extends Promise<infer T> ? T : never>()
  const dependencies: FormSubmissionOrchestratorDependencies = {
    forms: {
      async submit() {
        submitCalls += 1
        return submission
      },
    },
    security: {
      async protect(): Promise<SubmissionSecurityResult> {
        return { allowed: true, code: 'ALLOWED', message: 'Submission accepted.' }
      },
    },
    leads: {
      async createFromSubmission() {
        return { lead, event, created: true }
      },
    },
    delivery: {
      async enqueue() {
        return { status: 'delivered' as const }
      },
    },
    idempotency: {
      async get(formId, key) {
        return stored.get(`${formId}:${key}`)
      },
      async set(formId, key, result) {
        stored.set(`${formId}:${key}`, Promise.resolve(result))
      },
    },
    securityPolicy: {
      consent: { required: false },
      rateLimit: { maxAttempts: 3, windowMs: 60_000 },
      captcha: { required: false },
    },
    ...overrides,
  }
  return { dependencies, getSubmitCalls: () => submitCalls }
}

describe('FormSubmissionOrchestrator', () => {
  it('accepts a valid submission and reports delivered lead forwarding', async () => {
    const { dependencies } = createDependencies()
    const result = await new FormSubmissionOrchestrator(dependencies).submit({
      formId: 'contact',
      values: { email: 'ada@example.test' },
      security: { originKey: 'origin-1' },
    })

    expect(result).toMatchObject({ outcome: 'accepted', submission, leadId: 'lead-1', deliveryStatus: 'delivered' })
  })

  it('returns security failure before calling the form service', async () => {
    const { dependencies, getSubmitCalls } = createDependencies({
      security: {
        async protect(): Promise<SubmissionSecurityResult> {
          return { allowed: false, code: 'SUBMISSION_REJECTED', message: 'Unable to process this submission.' }
        },
      },
    })

    const result = await new FormSubmissionOrchestrator(dependencies).submit({
      formId: 'contact',
      values: { email: 'bot@example.test' },
      security: { originKey: 'origin-1', honeypotValue: 'filled' },
    })

    expect(result).toMatchObject({ outcome: 'securityFailure', security: { code: 'SUBMISSION_REJECTED' } })
    expect(getSubmitCalls()).toBe(0)
  })

  it('returns the original result for an idempotent duplicate', async () => {
    const { dependencies, getSubmitCalls } = createDependencies()
    const orchestrator = new FormSubmissionOrchestrator(dependencies)
    const input = { formId: 'contact', values: { email: 'ada@example.test' }, security: { originKey: 'origin-1' }, idempotencyKey: 'request-1' }

    const first = await orchestrator.submit(input)
    const duplicate = await orchestrator.submit(input)

    expect(first.outcome).toBe('accepted')
    expect(duplicate).toEqual({ outcome: 'duplicate', original: first })
    expect(getSubmitCalls()).toBe(1)
  })

  it('accepts the submission while leaving delivery pending after a provider failure', async () => {
    const { dependencies } = createDependencies({
      delivery: {
        async enqueue() {
          return { status: 'pending' as const }
        },
      },
    })

    const result = await new FormSubmissionOrchestrator(dependencies).submit({
      formId: 'contact',
      values: { email: 'ada@example.test' },
      security: { originKey: 'origin-1' },
    })

    expect(result).toMatchObject({ outcome: 'deliveryPending', submission, leadId: 'lead-1', deliveryStatus: 'pending' })
  })
})
