import type { NodePressContext } from '@/core/context'
import type { CachePort, ObjectStoragePort, PortHealth, QueuePort } from '@/core/ports'

interface CacheEntry { value: unknown; expiresAt?: number }

export class InMemoryCachePort implements CachePort {
  readonly id = 'cache.in-memory'
  readonly capabilities = ['get', 'set', 'delete', 'ttl'] as const
  private readonly values = new Map<string, CacheEntry>()

  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.values.get(key)
    if (!entry) return undefined
    if (entry.expiresAt !== undefined && entry.expiresAt <= this.now()) {
      this.values.delete(key)
      return undefined
    }
    return clone(entry.value) as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.values.set(key, { value: clone(value), expiresAt: ttlSeconds === undefined ? undefined : this.now() + Math.max(0, ttlSeconds) * 1000 })
  }

  async delete(key: string): Promise<void> { this.values.delete(key) }

  async health(_context: NodePressContext): Promise<PortHealth> { return { status: 'healthy', details: { entries: this.values.size } } }
}

export class InMemoryObjectStoragePort implements ObjectStoragePort {
  readonly id = 'storage.in-memory'
  readonly capabilities = ['put', 'get', 'delete'] as const
  private readonly values = new Map<string, { content: Uint8Array; contentType: string }>()

  async put(key: string, content: Uint8Array, contentType: string): Promise<void> {
    this.values.set(key, { content: new Uint8Array(content), contentType })
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const value = this.values.get(key)
    return value ? new Uint8Array(value.content) : undefined
  }

  async delete(key: string): Promise<void> { this.values.delete(key) }

  async health(_context: NodePressContext): Promise<PortHealth> { return { status: 'healthy', details: { objects: this.values.size } } }
}

export interface QueueMessage<T = unknown> { id: string; name: string; payload: T; idempotencyKey?: string }

export class InProcessQueuePort implements QueuePort {
  readonly id = 'queue.in-process'
  readonly capabilities = ['enqueue', 'idempotency', 'dequeue'] as const
  private readonly messages: QueueMessage[] = []
  private readonly idempotency = new Map<string, string>()

  async enqueue<T>(name: string, payload: T, idempotencyKey?: string): Promise<string> {
    if (idempotencyKey) {
      const existing = this.idempotency.get(idempotencyKey)
      if (existing) return existing
    }
    const id = crypto.randomUUID()
    this.messages.push({ id, name, payload: clone(payload), idempotencyKey })
    if (idempotencyKey) this.idempotency.set(idempotencyKey, id)
    return id
  }

  dequeue<T = unknown>(): QueueMessage<T> | undefined {
    const message = this.messages.shift()
    return message as QueueMessage<T> | undefined
  }

  pending(): QueueMessage[] { return this.messages.map((message) => ({ ...message, payload: clone(message.payload) })) }

  async health(_context: NodePressContext): Promise<PortHealth> { return { status: 'healthy', details: { pending: this.messages.length } } }
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : value
}
