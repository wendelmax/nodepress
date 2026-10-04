import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  getOrchestrator: vi.fn(),
}))

vi.mock('@/modules/forms', () => ({
  getFormSubmissionOrchestrator: mocks.getOrchestrator,
  FormNotFoundError: class FormNotFoundError extends Error {},
  FormUnavailableError: class FormUnavailableError extends Error {},
  FormValidationError: class FormValidationError extends Error {
    code = 'INVALID_SUBMISSION'
  },
}))

describe('canonical form submission security integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrchestrator.mockResolvedValue({ submit: mocks.submit })
  })

  it('returns safe rejection and does not persist when honeypot is filled', async () => {
    mocks.submit.mockResolvedValue({
      outcome: 'securityFailure',
      security: { allowed: false, code: 'SUBMISSION_REJECTED', message: 'Unable to process this submission.' },
    })

    const response = await POST(jsonRequest({
      values: { email: 'bot@example.test' },
      security: { honeypotValue: 'filled' },
    }), { params: Promise.resolve({ id: 'form-1' }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'SUBMISSION_REJECTED' })
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ formId: 'form-1' }))
  })

  it('returns Retry-After for a rate-limited submission', async () => {
    mocks.submit.mockResolvedValue({
      outcome: 'securityFailure',
      security: { allowed: false, code: 'RATE_LIMITED', message: 'Too many submissions. Please try again later.', retryAfterSeconds: 42 },
    })

    const response = await POST(jsonRequest({ values: { email: 'ada@example.test' } }), {
      params: Promise.resolve({ id: 'form-1' }),
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
  })

  it('returns accepted and pending delivery outcomes without leaking security inputs', async () => {
    mocks.submit.mockResolvedValue({
      outcome: 'deliveryPending',
      submission: { id: 'submission-1' },
      leadId: 'lead-1',
      deliveryStatus: 'pending',
    })

    const response = await POST(jsonRequest({
      values: { email: 'ada@example.test' },
      security: { captchaToken: 'secret-token', consent: { accepted: true } },
      idempotencyKey: 'request-1',
    }), { params: Promise.resolve({ id: 'form-1' }) })

    expect(response.status).toBe(202)
    const body = await response.json()
    expect(body).toMatchObject({ success: true, submissionId: 'submission-1', leadId: 'lead-1', deliveryStatus: 'pending' })
    expect(JSON.stringify(body)).not.toContain('secret-token')
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'request-1',
      security: expect.objectContaining({ captchaToken: 'secret-token' }),
    }))
  })
})

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/forms/form-1/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(body),
  })
}
