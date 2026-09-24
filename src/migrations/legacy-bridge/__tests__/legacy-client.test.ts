import { describe, expect, it, vi } from 'vitest'
import { LegacyClient } from '../legacy-client'

const page = {
  contractVersion: '1' as const,
  resource: 'animals' as const,
  runId: 'run-1',
  watermark: '2026-09-24T00:00:00.000Z',
  items: [],
  pageChecksum: 'sha256:page',
}

describe('legacy bridge client', () => {
  it('retries transient failures with bounded backoff and sends bridge headers', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(Response.json(page))
    const sleep = vi.fn().mockResolvedValue(undefined)
    const client = new LegacyClient({
      baseUrl: 'https://legacy.example.test/api/internal/nodepress-export',
      token: 'bridge-secret',
      audience: 'nodepress',
      fetchImpl,
      sleep,
    })

    await expect(client.fetchPage({ resource: 'animals', runId: 'run-1', limit: 10 })).resolves.toEqual(page)
    expect(client.lastRetryCount).toBe(2)
    expect(sleep).toHaveBeenNthCalledWith(1, 100)
    expect(sleep).toHaveBeenNthCalledWith(2, 500)
    expect(fetchImpl.mock.calls[2][1]).toEqual(expect.objectContaining({
      headers: {
        authorization: 'Bearer bridge-secret',
        'x-nodepress-audience': 'nodepress',
      },
    }))
  })

  it('does not retry an authorization failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }))
    const client = new LegacyClient({
      baseUrl: 'https://legacy.example.test/api/internal/nodepress-export',
      token: 'bridge-secret',
      audience: 'nodepress',
      fetchImpl,
      sleep: vi.fn(),
    })

    await expect(client.fetchPage({ resource: 'animals', runId: 'run-1', limit: 10 })).rejects.toThrow('Legacy export request failed: 403')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
