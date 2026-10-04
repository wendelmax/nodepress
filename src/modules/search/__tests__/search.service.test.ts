import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchService, SearchUnavailableError, SearchValidationError } from '../search.service'
import type { SearchAdapter } from '../search.types'

const mocks = vi.hoisted(() => ({
  getOptions: vi.fn(),
  saveOptions: vi.fn(),
}))

vi.mock('@/services/option.service', () => ({
  OptionService: {
    getOptions: mocks.getOptions,
    saveOptions: mocks.saveOptions,
  },
}))

describe('SearchService', () => {
  let adapter: FakeSearchAdapter
  let service: SearchService

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOptions.mockResolvedValue({})
    adapter = new FakeSearchAdapter()
    service = new SearchService({ 'local-postgres': adapter })
  })

  it('uses safe local defaults and forces public searches to published content', async () => {
    await service.search({ query: 'adoção', page: 2 }, { tenantId: 'tenant-a' })

    expect(adapter.lastQuery).toMatchObject({ page: 2, pageSize: 20, statuses: ['publish'], tenantId: 'tenant-a' })
  })

  it('rejects disabled search and page sizes above configured maximum', async () => {
    mocks.getOptions.mockResolvedValue({ search_enabled: 'false' })
    await expect(service.search({ query: 'x' })).rejects.toBeInstanceOf(SearchUnavailableError)

    mocks.getOptions.mockResolvedValue({ search_page_size: '50', search_max_page_size: '10' })
    await expect(service.search({ query: 'x' })).rejects.toBeInstanceOf(SearchValidationError)
  })

  it('exposes malformed query input as a validation error', async () => {
    await expect(service.search({ query: 'x', page: 'invalid' })).rejects.toBeInstanceOf(SearchValidationError)
  })

  it('persists validated admin configuration', async () => {
    const configuration = await service.updateConfiguration({ enabled: false, pageSize: 10, maxPageSize: 50 })

    expect(configuration).toEqual({ adapter: 'local-postgres', enabled: false, pageSize: 10, maxPageSize: 50 })
    expect(mocks.saveOptions).toHaveBeenCalledWith({
      search_adapter: 'local-postgres',
      search_enabled: 'false',
      search_page_size: '10',
      search_max_page_size: '50',
    })
  })
})

class FakeSearchAdapter implements SearchAdapter {
  readonly id = 'local-postgres'
  lastQuery: any

  async search(query: any) {
    this.lastQuery = query
    return { items: [], total: 0, totalPages: 0, page: query.page, pageSize: query.pageSize, query: query.query, adapter: this.id }
  }

  async health() {
    return { adapter: this.id, status: 'healthy' as const, checkedAt: new Date().toISOString() }
  }

  async reindex() {
    return { adapter: this.id, scanned: 0, indexed: 0, removed: 0, duplicates: 0, completedAt: new Date().toISOString() }
  }
}
