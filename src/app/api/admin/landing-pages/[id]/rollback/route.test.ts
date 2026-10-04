import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rollback: vi.fn(),
}))

vi.mock('../../_shared', () => ({
  requireLandingPageAdmin: mocks.requireAdmin,
  getLandingPageService: () => ({ rollback: mocks.rollback }),
  errorResponse: (error: Error) => Response.json({ message: error.message }, { status: 400 }),
}))

import { POST } from './route'

describe('landing page rollback API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('restores the requested immutable revision for an administrator', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ service: {} })
    mocks.rollback.mockResolvedValueOnce({ id: 'landing-1', status: 'draft' })

    const response = await POST(new Request('http://localhost/api/admin/landing-pages/landing-1/rollback', {
      method: 'POST',
      body: JSON.stringify({ revisionId: 'revision-1' }),
      headers: { 'content-type': 'application/json' },
    }), { params: Promise.resolve({ id: 'landing-1' }) })

    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'landing-1', status: 'draft' })
    expect(mocks.rollback).toHaveBeenCalledWith('landing-1', 'revision-1')
  })

  it('rejects a rollback without a revision id', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ service: {} })

    const response = await POST(new Request('http://localhost/api/admin/landing-pages/landing-1/rollback', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }), { params: Promise.resolve({ id: 'landing-1' }) })

    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(400)
    expect(mocks.rollback).not.toHaveBeenCalled()
  })
})
