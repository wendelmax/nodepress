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
  eventId?: string,
): Promise<void> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-NodePress-Signature': signWebhookPayload(body, secret),
  }
  if (eventId) headers['X-NodePress-Event-Id'] = eventId

  await transport.send({
    url,
    body,
    headers,
  })
}
