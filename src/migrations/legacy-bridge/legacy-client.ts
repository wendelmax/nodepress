import {
  parseLegacyExportPage,
  type LegacyExportPage,
  type LegacyExportRequest,
} from './contracts'

const retryDelays = [100, 500, 1500] as const

export interface LegacyClientOptions {
  baseUrl: string
  token: string
  audience: string
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  timeoutMs?: number
}

export class LegacyClient {
  lastRetryCount = 0

  private readonly fetchImpl: typeof fetch
  private readonly sleep: (milliseconds: number) => Promise<void>
  private readonly timeoutMs: number

  constructor(private readonly options: LegacyClientOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
    this.timeoutMs = options.timeoutMs ?? 10_000
  }

  async fetchPage(request: LegacyExportRequest): Promise<LegacyExportPage> {
    this.lastRetryCount = 0
    const url = new URL(this.options.baseUrl)
    url.searchParams.set('resource', request.resource)
    url.searchParams.set('runId', request.runId)
    url.searchParams.set('limit', String(request.limit))
    if (request.cursor) url.searchParams.set('cursor', request.cursor)
    if (request.updatedSince) url.searchParams.set('updatedSince', request.updatedSince)

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      let response: Response
      try {
        response = await this.fetchWithTimeout(url)
      } catch (error) {
        if (attempt === retryDelays.length - 1) throw normalizeNetworkError(error)
        await this.retry(attempt)
        continue
      }

      if (response.ok) {
        const body = await response.json()
        return parseLegacyExportPage(body)
      }

      if (!isRetryableStatus(response.status)) {
        throw new Error(`Legacy export request failed: ${response.status}`)
      }
      if (attempt === retryDelays.length - 1) {
        throw new Error(`Legacy export request failed: ${response.status}`)
      }
      await this.retry(attempt)
    }

    throw new Error('Legacy export request failed')
  }

  private async fetchWithTimeout(url: URL): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await this.fetchImpl(url, {
        headers: {
          authorization: `Bearer ${this.options.token}`,
          'x-nodepress-audience': this.options.audience,
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private async retry(attempt: number): Promise<void> {
    this.lastRetryCount += 1
    await this.sleep(retryDelays[attempt])
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function normalizeNetworkError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') return new Error('Legacy export request timed out')
  return error instanceof Error ? error : new Error('Legacy export request failed')
}
