import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH } from '../route'
import { POST } from '../reindex/route'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getConfiguration: vi.fn(),
  updateConfiguration: vi.fn(),
  health: vi.fn(),
  reindex: vi.fn(),
}))

vi.mock('@/app/api/admin/plugins/_shared', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/modules/search', () => ({
  SearchValidationError: class SearchValidationError extends Error {},
  searchService: {
    getConfiguration: mocks.getConfiguration,
    updateConfiguration: mocks.updateConfiguration,
    health: mocks.health,
    reindex: mocks.reindex,
  },
}))

describe('admin search routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ response: Response.json({ error: 'Forbidden' }, { status: 403 }) })
    mocks.getConfiguration.mockResolvedValue({ adapter: 'local-postgres', enabled: true, pageSize: 20, maxPageSize: 100 })
    mocks.updateConfiguration.mockResolvedValue({ adapter: 'local-postgres', enabled: false, pageSize: 10, maxPageSize: 50 })
    mocks.health.mockResolvedValue({
      configuration: { adapter: 'local-postgres', enabled: true, pageSize: 20, maxPageSize: 100 },
      adapter: { adapter: 'local-postgres', status: 'healthy' },
    })
    mocks.reindex.mockResolvedValue({ adapter: 'local-postgres', scanned: 4, indexed: 4, removed: 4, duplicates: 0 })
  })

  it('denies unauthorised configuration and reindex operations', async () => {
    expect((await GET())?.status).toBe(403)
    expect((await PATCH(new Request('http://localhost/api/admin/search', { method: 'PATCH', body: '{}' })))?.status).toBe(403)
    expect((await POST(new Request('http://localhost/api/admin/search/reindex', { method: 'POST', body: '{}' })))?.status).toBe(403)
    expect(mocks.health).not.toHaveBeenCalled()
    expect(mocks.reindex).not.toHaveBeenCalled()
  })

  it('returns health and delegates validated configuration to the service', async () => {
    mocks.requireAdmin.mockResolvedValue({ service: {} })

    const health = await GET()
    const patch = await PATCH(new Request('http://localhost/api/admin/search', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false, pageSize: 10, maxPageSize: 50 }),
    }))

    expect(health?.status).toBe(200)
    await expect(health?.json()).resolves.toMatchObject({ adapter: { status: 'healthy' } })
    expect(patch?.status).toBe(200)
    expect(mocks.updateConfiguration).toHaveBeenCalledWith({ enabled: false, pageSize: 10, maxPageSize: 50 })
  })

  it('rejects malformed configuration payloads without invoking the service', async () => {
    mocks.requireAdmin.mockResolvedValue({ service: {} })

    const response = await PATCH(new Request('http://localhost/api/admin/search', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    }))

    expect(response?.status).toBe(400)
    expect(mocks.updateConfiguration).not.toHaveBeenCalled()
  })

  it('delegates tenant-scoped reindexing only to an admin', async () => {
    mocks.requireAdmin.mockResolvedValue({ service: {} })

    const response = await POST(new Request('http://localhost/api/admin/search/reindex', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-a' }),
    }))

    expect(response?.status).toBe(200)
    expect(mocks.reindex).toHaveBeenCalledWith({ tenantId: 'tenant-a' })
  })
})
