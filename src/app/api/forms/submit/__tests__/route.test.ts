import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

const mocks = vi.hoisted(() => ({
  postFindUnique: vi.fn(),
  ensureLegacyForm: vi.fn(),
  orchestratorSubmit: vi.fn(),
  getOrchestrator: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: { post: { findUnique: mocks.postFindUnique } },
}))

vi.mock('@/modules/forms/legacy-form-adapter', () => ({
  ensureLegacyFormDefinition: mocks.ensureLegacyForm,
  LegacyFormMappingError: class LegacyFormMappingError extends Error {},
}))

vi.mock('@/modules/forms', () => ({
  getFormSubmissionOrchestrator: mocks.getOrchestrator,
}))

describe('legacy form submission shim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FORMS_LEGACY_SUNSET = 'Wed, 31 Dec 2026 23:59:59 GMT'
    mocks.getOrchestrator.mockResolvedValue({ submit: mocks.orchestratorSubmit })
    mocks.postFindUnique.mockResolvedValue({
      id: 42,
      postType: 'form',
      postName: 'contact',
      postTitle: 'Contact',
      postContent: JSON.stringify([{ name: 'email', label: 'Email', type: 'email', required: true }]),
    })
    mocks.ensureLegacyForm.mockResolvedValue({ id: 'legacy-42' })
  })

  it('delegates legacy payloads and emits deprecation metadata', async () => {
    mocks.orchestratorSubmit.mockResolvedValue({
      outcome: 'accepted',
      submission: { id: 'submission-1' },
      leadId: 'lead-1',
      deliveryStatus: 'delivered',
    })

    const response = await POST(jsonRequest({ formId: '42', email: 'ada@example.test' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Deprecation')).toBe('true')
    expect(response.headers.get('Sunset')).toBe('Wed, 31 Dec 2026 23:59:59 GMT')
    expect(response.headers.get('Link')).toContain('/api/forms/legacy-42/submissions')
    await expect(response.json()).resolves.toMatchObject({ success: true, submissionId: 'submission-1' })
    expect(mocks.orchestratorSubmit).toHaveBeenCalledWith(expect.objectContaining({
      formId: 'legacy-42',
      values: { email: 'ada@example.test' },
    }))
  })

  it('keeps the legacy not-found response stable', async () => {
    mocks.postFindUnique.mockResolvedValue(null)

    const response = await POST(jsonRequest({ formId: '404', email: 'ada@example.test' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Form not found' })
    expect(response.headers.get('Deprecation')).toBe('true')
  })
})

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/forms/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(body),
  })
}
