import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  list: vi.fn(),
  export: vi.fn(),
}))

vi.mock('@/app/api/admin/plugins/_shared', () => ({ requireAdmin: mocks.requireAdmin }))

import { GET } from '../route'

describe('admin audit log API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ auditLogService: { list: mocks.list, export: mocks.export } })
    mocks.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 })
    mocks.export.mockResolvedValue({
      body: 'id,action\n1,post.updated',
      contentType: 'text/csv; charset=utf-8',
      filename: 'audit-logs.csv',
    })
  })

  it('rejects non-admin access before querying logs', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ response: Response.json({ error: 'Forbidden' }, { status: 403 }) })

    const response = await GET(new Request('http://localhost/api/admin/audit-logs'))

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('passes validated filters to the audit service', async () => {
    const response = await GET(new Request('http://localhost/api/admin/audit-logs?page=2&pageSize=50&action=post.updated&success=true&actorUserId=7'))

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith({ page: 2, pageSize: 50, action: 'post.updated', success: true, actorUserId: 7 })
  })

  it('returns CSV with download headers when requested', async () => {
    const response = await GET(new Request('http://localhost/api/admin/audit-logs?format=csv&resourceType=post'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="audit-logs.csv"')
    expect(await response.text()).toContain('post.updated')
    expect(mocks.export).toHaveBeenCalledWith({ page: 1, pageSize: 25, resourceType: 'post' }, 'csv')
  })

  it('rejects malformed numeric and date filters', async () => {
    const response = await GET(new Request('http://localhost/api/admin/audit-logs?page=nope&from=not-a-date'))

    expect(response.status).toBe(400)
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.export).not.toHaveBeenCalled()
  })
})
