import { describe, expect, it } from 'vitest'
import {
  sendSignedWebhook,
  signWebhookPayload,
  verifyWebhookSignature,
  type WebhookRequest,
  type WebhookTransportPort,
} from '../index'

describe('signed webhooks', () => {
  it('signs and verifies the exact payload with HMAC-SHA256', () => {
    const payload = '{"id":"evt-1"}'
    const signature = signWebhookPayload(payload, 'secret')

    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)
    expect(verifyWebhookSignature(payload, signature, 'secret')).toBe(true)
    expect(verifyWebhookSignature(`${payload} `, signature, 'secret')).toBe(false)
    expect(verifyWebhookSignature(payload, signature, 'other-secret')).toBe(false)
  })

  it('rejects malformed signatures', () => {
    const payload = '{"id":"evt-1"}'

    expect(verifyWebhookSignature(payload, 'sha1=abc', 'secret')).toBe(false)
    expect(verifyWebhookSignature(payload, 'sha256=abc', 'secret')).toBe(false)
    expect(verifyWebhookSignature(payload, 'not-a-signature', 'secret')).toBe(false)
  })

  it('sends JSON with a deterministic signature header through the injected transport', async () => {
    const requests: WebhookRequest[] = []
    const transport: WebhookTransportPort = {
      async send(request) {
        requests.push(request)
      },
    }

    await sendSignedWebhook(transport, 'https://example.test/leads', { id: 'evt-1', name: 'Ada' }, 'secret')

    expect(requests).toHaveLength(1)
    expect(requests[0]).toEqual({
      url: 'https://example.test/leads',
      body: '{"id":"evt-1","name":"Ada"}',
      headers: {
        'Content-Type': 'application/json',
        'X-NodePress-Signature': signWebhookPayload('{"id":"evt-1","name":"Ada"}', 'secret'),
      },
    })
  })
})

