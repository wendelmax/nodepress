import { describe, expect, it } from 'vitest'
import { WebhookDeliveryService } from '../webhook-delivery'

describe('WebhookDeliveryService', () => {
  it('retries transient failures with exponential backoff and delivers once', async () => {
    const attempts: string[] = []
    const delays: number[] = []
    let calls = 0
    const service = new WebhookDeliveryService({
      async send(request) {
        attempts.push(request.headers['X-NodePress-Event-Id'])
        calls += 1
        if (calls < 3) throw new Error('temporary outage')
      },
      sleep: async (delay) => {
        delays.push(delay)
      },
    })

    const result = await service.deliver({
      eventId: 'event-1',
      url: 'https://example.test/hook',
      payload: { leadId: 'lead-1' },
      secret: 'secret',
      policy: { maxAttempts: 3, baseDelayMs: 10 },
    })

    expect(result).toEqual({ eventId: 'event-1', status: 'delivered', attempts: 3 })
    expect(attempts).toEqual(['event-1', 'event-1', 'event-1'])
    expect(delays).toEqual([10, 20])
  })

  it('does not deliver a successful event twice and allows explicit reprocessing after failure', async () => {
    let calls = 0
    const service = new WebhookDeliveryService({
      async send() {
        calls += 1
        if (calls === 1) throw new Error('downstream unavailable')
      },
      sleep: async () => undefined,
    })

    const failed = await service.deliver({
      eventId: 'event-2',
      url: 'https://example.test/hook',
      payload: {},
      secret: 'secret',
      policy: { maxAttempts: 1, baseDelayMs: 1 },
    })
    const delivered = await service.deliver({
      eventId: 'event-2',
      url: 'https://example.test/hook',
      payload: {},
      secret: 'secret',
      policy: { maxAttempts: 1, baseDelayMs: 1 },
    })
    const duplicate = await service.deliver({
      eventId: 'event-2',
      url: 'https://example.test/hook',
      payload: {},
      secret: 'secret',
      policy: { maxAttempts: 1, baseDelayMs: 1 },
    })

    expect(failed.status).toBe('failed')
    expect(delivered).toEqual({ eventId: 'event-2', status: 'delivered', attempts: 1 })
    expect(duplicate).toEqual({ eventId: 'event-2', status: 'delivered', attempts: 0 })
    expect(calls).toBe(2)
  })
})
