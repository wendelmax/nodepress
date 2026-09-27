import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  service: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../_shared', () => ({
  requireLandingPageAdmin: mocks.requireAdmin,
  getLandingPageService: () => mocks.service,
  parseLandingPageInput: (body: Record<string, unknown>) => ({
    title: body.title,
    document: body.document,
    status: body.status ?? 'draft',
  }),
  errorResponse: (error: Error) => Response.json({ message: error.message }, { status: 400 }),
}))

import { GET, POST } from '../route'

describe('landing pages admin API', () => {
  it('rejects unauthenticated list requests', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const response = await GET()

    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(403)
    expect(mocks.service.list).not.toHaveBeenCalled()
  })

  it('creates a landing page for an administrator', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ service: {} })
    mocks.service.create.mockResolvedValueOnce({ id: 'landing-1', title: 'Campaign' })

    const response = await POST(new Request('http://localhost/api/admin/landing-pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Campaign', document: { content: [], root: {} } }),
      headers: { 'content-type': 'application/json' },
    }))

    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: 'landing-1', title: 'Campaign' })
    expect(mocks.service.create).toHaveBeenCalledWith({
      title: 'Campaign',
      document: { content: [], root: {} },
      status: 'draft',
    })
  })

  it('returns a client error when the service rejects the payload', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ service: {} })
    mocks.service.create.mockRejectedValueOnce(new Error('Landing page title is required'))

    const response = await POST(new Request('http://localhost/api/admin/landing-pages', {
      method: 'POST',
      body: JSON.stringify({ title: '', document: {} }),
      headers: { 'content-type': 'application/json' },
    }))

    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Landing page title is required' })
  })
})
