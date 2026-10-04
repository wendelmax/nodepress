import { signWebhookPayload } from './webhook-signature'

export interface WebhookRequest {
  url: string
  body: string
  headers: Record<string, string>
}

export interface WebhookTransportPort {
  send(request: WebhookRequest): Promise<void>
}

export async function sendSignedWebhook(
  transport: WebhookTransportPort,
  url: string,
  payload: unknown,
  secret: string,
): Promise<void> {
  const body = JSON.stringify(payload)
  await transport.send({
    url,
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-NodePress-Signature': signWebhookPayload(body, secret),
    },
  })
}
