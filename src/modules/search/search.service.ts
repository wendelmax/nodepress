import { OptionService } from '@/services/option.service'
import { PrismaSearchAdapter } from './prisma-search-adapter'
import { normalizeSearchQuery } from './search.utils'
import type {
  SearchAdapter,
  SearchConfiguration,
  SearchHealth,
  SearchReindexInput,
} from './search.types'

const OPTION_KEYS = ['search_adapter', 'search_enabled', 'search_page_size', 'search_max_page_size']
const DEFAULT_CONFIGURATION: SearchConfiguration = {
  adapter: 'local-postgres',
  enabled: true,
  pageSize: 20,
  maxPageSize: 100,
}

export class SearchValidationError extends Error {}
export class SearchUnavailableError extends Error {}

export interface SearchContext {
  tenantId?: string
}

export class SearchService {
  constructor(private readonly adapters: Record<string, SearchAdapter> = { 'local-postgres': new PrismaSearchAdapter() }) {}

  async getConfiguration(): Promise<SearchConfiguration> {
    const values = await OptionService.getOptions(OPTION_KEYS)
    return parseConfiguration(values)
  }

  async updateConfiguration(input: Record<string, unknown>): Promise<SearchConfiguration> {
    const current = await this.getConfiguration()
    const next = parseConfiguration({
      search_adapter: input.adapter ?? current.adapter,
      search_enabled: input.enabled ?? current.enabled,
      search_page_size: input.pageSize ?? current.pageSize,
      search_max_page_size: input.maxPageSize ?? current.maxPageSize,
    })
    await OptionService.saveOptions({
      search_adapter: next.adapter,
      search_enabled: String(next.enabled),
      search_page_size: String(next.pageSize),
      search_max_page_size: String(next.maxPageSize),
    })
    return next
  }

  async search(input: Record<string, unknown>, context: SearchContext = {}) {
    const configuration = await this.getConfiguration()
    if (!configuration.enabled) throw new SearchUnavailableError('Search is disabled')
    let query: ReturnType<typeof normalizeSearchQuery>
    try {
      query = normalizeSearchQuery({
        ...input,
        pageSize: input.pageSize ?? configuration.pageSize,
        tenantId: context.tenantId,
        statuses: ['publish'],
      })
    } catch (error) {
      throw new SearchValidationError(error instanceof Error ? error.message : 'Invalid search query')
    }
    if (query.pageSize > configuration.maxPageSize) {
      throw new SearchValidationError(`Page size must be between 1 and ${configuration.maxPageSize}`)
    }
    return this.getAdapter(configuration.adapter).search(query)
  }

  async health(): Promise<{ configuration: SearchConfiguration; adapter: SearchHealth }> {
    const configuration = await this.getConfiguration()
    if (!configuration.enabled) {
      return {
        configuration,
        adapter: {
          adapter: configuration.adapter,
          status: 'degraded',
          checkedAt: new Date().toISOString(),
          details: { reason: 'search_disabled' },
        },
      }
    }
    return { configuration, adapter: await this.getAdapter(configuration.adapter).health() }
  }

  async reindex(input: SearchReindexInput = {}) {
    const configuration = await this.getConfiguration()
    return this.getAdapter(configuration.adapter).reindex(input)
  }

  private getAdapter(id: string): SearchAdapter {
    const adapter = this.adapters[id]
    if (!adapter) throw new SearchValidationError(`Unsupported search adapter: ${id}`)
    return adapter
  }
}

export const searchService = new SearchService()

function parseConfiguration(values: Record<string, unknown>): SearchConfiguration {
  const adapter = values.search_adapter === undefined || values.search_adapter === ''
    ? DEFAULT_CONFIGURATION.adapter
    : String(values.search_adapter)
  if (adapter !== 'local-postgres') throw new SearchValidationError(`Unsupported search adapter: ${adapter}`)

  const enabled = parseBoolean(values.search_enabled, DEFAULT_CONFIGURATION.enabled)
  const pageSize = parseBoundedInteger(values.search_page_size, DEFAULT_CONFIGURATION.pageSize, 'page size')
  const maxPageSize = parseBoundedInteger(values.search_max_page_size, DEFAULT_CONFIGURATION.maxPageSize, 'max page size')
  if (pageSize > maxPageSize) throw new SearchValidationError('Page size cannot exceed max page size')
  return { adapter, enabled, pageSize, maxPageSize }
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new SearchValidationError('Search enabled must be a boolean')
}

function parseBoundedInteger(value: unknown, fallback: number, label: string): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new SearchValidationError(`Invalid search ${label}`)
  }
  return parsed
}
