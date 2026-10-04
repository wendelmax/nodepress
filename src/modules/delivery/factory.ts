import { DeliveryWorker } from './delivery-worker'
import { PrismaDeliveryRepository } from './prisma-delivery-repository'
import { WebhookDeliveryService } from './webhook-delivery'

export interface LeadDeliveryWorkerOptions {
  url?: string
  secret?: string
  maxAttempts?: number
  baseDelayMs?: number
}

export function createLeadDeliveryWorker(options: LeadDeliveryWorkerOptions = {}): DeliveryWorker {
  const url = options.url ?? process.env.FORMS_DELIVERY_WEBHOOK_URL
  const secret = options.secret ?? process.env.FORMS_DELIVERY_WEBHOOK_SECRET
  const webhook = url && secret
    ? new WebhookDeliveryService({
        async send(request) {
          const response = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: request.body,
          })
          if (!response.ok) throw new Error(`Delivery provider responded with ${response.status}`)
        },
      })
    : undefined

  return new DeliveryWorker({
    repository: new PrismaDeliveryRepository(),
    maxAttempts: options.maxAttempts,
    baseDelayMs: options.baseDelayMs,
    async deliver(record) {
      if (!webhook || !url || !secret) throw new Error('No lead delivery webhook is configured')
      const result = await webhook.deliver({
        eventId: record.eventId,
        url,
        payload: record.payload,
        secret,
        policy: { maxAttempts: 1, baseDelayMs: 0 },
      })
      if (result.status === 'failed') throw new Error('Delivery webhook failed')
    },
  })
}
