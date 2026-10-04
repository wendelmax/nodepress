import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  orchestratorSubmit: vi.fn(),
  getOrchestrator: vi.fn(),
  listSubmissions: vi.fn(),
}))

vi.mock('@/modules/forms', () => ({
  formService: mocks,
  getFormSubmissionOrchestrator: mocks.getOrchestrator,
  FormNotFoundError: class FormNotFoundError extends Error {},
  FormUnavailableError: class FormUnavailableError extends Error {},
  FormValidationError: class FormValidationError extends Error {
    code = 'INVALID_SUBMISSION'
  },
}))

describe('/api/forms/[id]/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrchestrator.mockResolvedValue({ submit: mocks.orchestratorSubmit })
  })

  it('submits values for a form', async () => {
    const submission = { id: 'submission-1', formId: 'form-1', payload: { message: 'Hello' } }
    mocks.orchestratorSubmit.mockResolvedValue({
      outcome: 'accepted',
      submission,
      leadId: 'lead-1',
      deliveryStatus: 'delivered',
    })

    const response = await POST(
      jsonRequest({ values: { message: 'Hello' } }),
      { params: Promise.resolve({ id: 'form-1' }) },
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      success: true,
      submissionId: 'submission-1',
      leadId: 'lead-1',
      deliveryStatus: 'delivered',
    })
    expect(mocks.orchestratorSubmit).toHaveBeenCalledWith(expect.objectContaining({
      formId: 'form-1',
      values: { message: 'Hello' },
    }))
  })

  it('rejects a malformed submission request before calling the service', async () => {
    const response = await POST(
      jsonRequest({ values: 'not-an-object' }),
      { params: Promise.resolve({ id: 'form-1' }) },
    )

    expect(response.status).toBe(400)
    expect(mocks.orchestratorSubmit).not.toHaveBeenCalled()
  })

  it('lists submissions for a form', async () => {
    mocks.listSubmissions.mockResolvedValue([{ id: 'submission-1', formId: 'form-1', payload: { message: 'Hello' } }])

    const response = await GET(new Request('http://localhost/api/forms/form-1/submissions'), {
      params: Promise.resolve({ id: 'form-1' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toHaveLength(1)
    expect(mocks.listSubmissions).toHaveBeenCalledWith('form-1')
  })
})

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/forms/form-1/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
