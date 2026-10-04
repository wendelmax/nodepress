import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
}))

vi.mock('@/modules/search', () => ({
  searchService: { search: mocks.search },
}))

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.search.mockResolvedValue({
      items: [{ id: '1', kind: 'post', type: 'post', title: 'Adoção', slug: 'adocao', url: '/adocao', excerpt: 'Resumo', score: 18, highlights: [] }],
      total: 1,
      totalPages: 1,
      page: 1,
      pageSize: 20,
      query: 'adoção',
      adapter: 'local-postgres',
    })
  })

  it('returns search results while forwarding safe public filters', async () => {
    const response = await GET(new Request('http://localhost/api/search?q=adoção&type=post&category=adoção&page=2&pageSize=5'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ total: 1, items: [{ id: '1' }] })
    expect(mocks.search).toHaveBeenCalledWith(expect.objectContaining({
      query: 'adoção',
      page: '2',
      pageSize: '5',
      types: ['post'],
      categories: ['adoção'],
      statuses: ['publish'],
    }), expect.objectContaining({ tenantId: undefined }))
  })

  it('rejects empty, invalid, or non-public status queries', async () => {
    await expect(GET(new Request('http://localhost/api/search'))).resolves.toMatchObject({ status: 400 })
    await expect(GET(new Request('http://localhost/api/search?q=adoção&pageSize=101'))).resolves.toMatchObject({ status: 400 })
    await expect(GET(new Request('http://localhost/api/search?q=adoção&status=draft'))).resolves.toMatchObject({ status: 400 })
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it('uses configured tenant context without trusting a public query parameter', async () => {
    const previous = process.env.NODEPRESS_TENANT_ID
    process.env.NODEPRESS_TENANT_ID = 'tenant-a'

    await GET(new Request('http://localhost/api/search?q=rex&tenantId=tenant-b'))

    expect(mocks.search).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tenantId: 'tenant-a' }))
    if (previous === undefined) delete process.env.NODEPRESS_TENANT_ID
    else process.env.NODEPRESS_TENANT_ID = previous
  })
})
