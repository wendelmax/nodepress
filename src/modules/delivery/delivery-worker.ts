import type { DeliveryRecord } from './prisma-delivery-repository'

export interface DeliveryWorkerStore {
  findDue(now: Date, limit: number): Promise<DeliveryRecord[]>
  markDelivered(id: string): Promise<void>
  markRetryable(id: string, nextAttemptAt: Date, lastError: string): Promise<void>
  markFailed(id: string, lastError: string): Promise<void>
}

export interface DeliveryWorkerDependencies {
  repository: DeliveryWorkerStore
  deliver(record: DeliveryRecord): Promise<void>
  maxAttempts?: number
  baseDelayMs?: number
}

export interface DeliveryWorkerOptions {
  now?: Date
  limit?: number
}

export interface DeliveryWorkerSummary {
  selected: number
  delivered: number
  retryable: number
  failed: number
}

export class DeliveryWorker {
  private readonly maxAttempts: number
  private readonly baseDelayMs: number

  constructor(private readonly dependencies: DeliveryWorkerDependencies) {
    this.maxAttempts = dependencies.maxAttempts ?? 3
    this.baseDelayMs = dependencies.baseDelayMs ?? 60_000
    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) throw new Error('Delivery max attempts must be a positive integer')
    if (!Number.isFinite(this.baseDelayMs) || this.baseDelayMs < 0) throw new Error('Delivery base delay must be non-negative')
  }

  async process(options: DeliveryWorkerOptions = {}): Promise<DeliveryWorkerSummary> {
    const now = options.now ?? new Date()
    const limit = options.limit ?? 50
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Delivery batch limit must be a positive integer')

    const records = await this.dependencies.repository.findDue(now, limit)
    const summary: DeliveryWorkerSummary = { selected: records.length, delivered: 0, retryable: 0, failed: 0 }
    for (const record of records) {
      try {
        await this.dependencies.deliver(record)
        await this.dependencies.repository.markDelivered(record.id)
        summary.delivered += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Delivery provider failed'
        const nextAttempt = record.attempts + 1
        if (nextAttempt >= this.maxAttempts) {
          await this.dependencies.repository.markFailed(record.id, message)
          summary.failed += 1
        } else {
          const delay = this.baseDelayMs * 2 ** record.attempts
          await this.dependencies.repository.markRetryable(record.id, new Date(now.getTime() + delay), message)
          summary.retryable += 1
        }
      }
    }
    return summary
  }
}
