import prisma from '@/lib/prisma'

export type DeliveryStatus = 'pending' | 'retryable' | 'delivered' | 'failed'

export interface DeliveryRecord {
  id: string
  eventId: string
  targetId: string
  payload: Record<string, unknown>
  status: DeliveryStatus
  attempts: number
  nextAttemptAt: Date
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export interface EnqueueDeliveryInput {
  eventId: string
  targetId: string
  payload: Record<string, unknown>
}

interface LeadDeliveryClient {
  upsert(args: unknown): Promise<unknown>
  findMany(args: unknown): Promise<unknown[]>
  update?(args: unknown): Promise<unknown>
}

export class PrismaDeliveryRepository {
  private readonly client: LeadDeliveryClient

  constructor(client: LeadDeliveryClient = prisma.leadDelivery as unknown as LeadDeliveryClient) {
    this.client = client
  }

  async enqueue(input: EnqueueDeliveryInput): Promise<DeliveryRecord> {
    const row = await this.client.upsert({
      where: { eventId_targetId: { eventId: input.eventId, targetId: input.targetId } },
      create: {
        eventId: input.eventId,
        targetId: input.targetId,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
      },
      update: {},
    })
    return toDelivery(row)
  }

  async findDue(now: Date, limit: number): Promise<DeliveryRecord[]> {
    const rows = await this.client.findMany({
      where: {
        status: { in: ['pending', 'retryable'] },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    })
    return rows.map(toDelivery)
  }

  async markDelivered(id: string): Promise<void> {
    await this.update({ where: { id }, data: { status: 'delivered', lastError: null } })
  }

  async markRetryable(id: string, nextAttemptAt: Date, lastError: string): Promise<void> {
    await this.update({
      where: { id },
      data: { status: 'retryable', attempts: { increment: 1 }, nextAttemptAt, lastError },
    })
  }

  async markFailed(id: string, lastError: string): Promise<void> {
    await this.update({ where: { id }, data: { status: 'failed', attempts: { increment: 1 }, lastError } })
  }

  private async update(args: unknown): Promise<void> {
    if (!this.client.update) throw new Error('Delivery repository does not support state updates')
    await this.client.update(args)
  }
}

function toDelivery(value: unknown): DeliveryRecord {
  const row = value as Record<string, unknown>
  return {
    id: String(row.id ?? ''),
    eventId: String(row.eventId),
    targetId: String(row.targetId),
    payload: row.payload as Record<string, unknown>,
    status: row.status as DeliveryStatus,
    attempts: Number(row.attempts ?? 0),
    nextAttemptAt: new Date(String(row.nextAttemptAt ?? new Date().toISOString())),
    ...(row.lastError ? { lastError: String(row.lastError) } : {}),
    createdAt: new Date(String(row.createdAt ?? new Date().toISOString())),
    updatedAt: new Date(String(row.updatedAt ?? new Date().toISOString())),
  }
}
