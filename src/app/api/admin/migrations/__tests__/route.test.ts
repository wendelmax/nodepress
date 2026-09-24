import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodePressError } from '@/core/errors'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  service: {
    listRuns: vi.fn(),
    startRun: vi.fn(),
    cancelRun: vi.fn(),
    getCutover: vi.fn(),
    changeCutover: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/migrations/legacy-bridge/admin-service', () => ({
  getMigrationAdminService: vi.fn(() => mocks.service),
}))

describe('migration and cutover admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.service.listRuns.mockResolvedValue([])
    mocks.service.startRun.mockResolvedValue({ runId: 'run-1', status: 'running' })
    mocks.service.getCutover.mockResolvedValue({ domain: 'animals', state: 'shadow' })
    mocks.service.changeCutover.mockResolvedValue({ domain: 'animals', state: 'ready' })
  })

  it('returns 401 for an unauthenticated migration request', async () => {
    mocks.auth.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/migrations/route')

    const response = await GET(new Request('https://nodepress.test/api/admin/migrations'))

    expect(response!.status).toBe(401)
    expect(mocks.service.listRuns).not.toHaveBeenCalled()
  })

  it('returns 403 for a volunteer cutover request', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'volunteer-1', role: 'volunteer' } })
    const { POST } = await import('@/app/api/admin/cutover/route')

    const response = await POST(new Request('https://nodepress.test/api/admin/cutover', {
      method: 'POST',
      body: JSON.stringify({ domain: 'animals', to: 'active' }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response!.status).toBe(403)
    expect(mocks.service.changeCutover).not.toHaveBeenCalled()
  })

  it('does not activate a domain with blocking reconciliation errors', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    mocks.service.changeCutover.mockRejectedValue(new NodePressError('CONFLICT', 'Cutover blocked by reconciliation errors', 409))
    const { POST } = await import('@/app/api/admin/cutover/route')

    const response = await POST(new Request('https://nodepress.test/api/admin/cutover', {
      method: 'POST',
      body: JSON.stringify({
        domain: 'animals',
        to: 'active',
        reconciliation: { status: 'failed', blockingErrors: ['missing:animals:animal-1'] },
      }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response!.status).toBe(409)
  })
})
