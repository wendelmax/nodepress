import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('@/modules/forms', () => ({
  formService: mocks,
  FormValidationError: class FormValidationError extends Error {
    code = 'INVALID_SCHEMA'
  },
  FormConflictError: class FormConflictError extends Error {},
}))

describe('POST /api/forms', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a form and returns the public definition', async () => {
    const form = {
      id: 'form-1',
      slug: 'contact',
      name: 'Contact',
      status: 'active',
      fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
    }
    mocks.create.mockResolvedValue(form)

    const response = await POST(jsonRequest({
      slug: 'contact',
      name: 'Contact',
      fields: form.fields,
    }))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual(form)
    expect(mocks.create).toHaveBeenCalledWith({
      slug: 'contact',
      name: 'Contact',
      fields: form.fields,
    })
  })

  it('maps malformed JSON and domain validation errors to 400', async () => {
    const malformed = await POST(new Request('http://localhost/api/forms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }))
    expect(malformed.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()

    mocks.create.mockRejectedValue(new Error('Form name is required'))
    const invalid = await POST(jsonRequest({ slug: 'contact', name: '', fields: [] }))
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toMatchObject({ code: 'invalid_request' })
  })
})

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/forms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
