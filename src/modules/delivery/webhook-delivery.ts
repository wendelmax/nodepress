import { sendSignedWebhook, type WebhookTransportPort } from './webhook-transport'

export interface WebhookDeliveryPolicy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs?: number
}

export interface WebhookDeliveryInput {
  eventId: string
  url: string
  payload: unknown
  secret: string
  policy: WebhookDeliveryPolicy
}

export interface WebhookDeliveryResult {
  eventId: string
  status: 'delivered' | 'failed'
  attempts: number
}

export interface WebhookDeliveryDependencies extends WebhookTransportPort {
  sleep?: (delayMs: number) => Promise<void>
}

export class WebhookDeliveryService {
  private readonly completedEvents = new Set<string>()
  private readonly sleep: (delayMs: number) => Promise<void>

  constructor(private readonly dependencies: WebhookDeliveryDependencies) {
    this.sleep = dependencies.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)))
  }

  async deliver(input: WebhookDeliveryInput): Promise<WebhookDeliveryResult> {
    if (!input.eventId.trim()) throw new Error('Webhook event ID is required')
    validatePolicy(input.policy)
    if (this.completedEvents.has(input.eventId)) {
      return { eventId: input.eventId, status: 'delivered', attempts: 0 }
    }

    let attempts = 0
    while (attempts < input.policy.maxAttempts) {
      attempts += 1
      try {
        await sendSignedWebhook(this.dependencies, input.url, input.payload, input.secret, input.eventId)
        this.completedEvents.add(input.eventId)
        return { eventId: input.eventId, status: 'delivered', attempts }
      } catch {
        if (attempts === input.policy.maxAttempts) break
        const delay = Math.min(
          input.policy.maxDelayMs ?? Number.MAX_SAFE_INTEGER,
          input.policy.baseDelayMs * 2 ** (attempts - 1),
        )
        await this.sleep(delay)
      }
    }

    return { eventId: input.eventId, status: 'failed', attempts }
  }
}

function validatePolicy(policy: WebhookDeliveryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new Error('Webhook max attempts must be a positive integer')
  }
  if (!Number.isFinite(policy.baseDelayMs) || policy.baseDelayMs < 0) {
    throw new Error('Webhook base delay must be a non-negative number')
  }
  if (policy.maxDelayMs !== undefined && (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < policy.baseDelayMs)) {
    throw new Error('Webhook max delay must be greater than or equal to the base delay')
  }
}
