import { createHmac, timingSafeEqual } from 'node:crypto'

const signaturePrefix = 'sha256='

export function signWebhookPayload(payload: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
  return `${signaturePrefix}${digest}`
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith(signaturePrefix)) return false

  const received = Buffer.from(signature.slice(signaturePrefix.length), 'hex')
  const expected = Buffer.from(signWebhookPayload(payload, secret).slice(signaturePrefix.length), 'hex')
  if (received.length !== expected.length || received.length !== 32) return false
  return timingSafeEqual(received, expected)
}
