import type { NodePressContext } from '../context'

export type PortHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface PortHealth {
  status: PortHealthStatus
  details?: Record<string, unknown>
}

export interface NodePressPort {
  id: string
  capabilities: readonly string[]
  health(context: NodePressContext): Promise<PortHealth>
}

export interface CachePort extends NodePressPort {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface ObjectStoragePort extends NodePressPort {
  put(key: string, content: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<Uint8Array | undefined>
  delete(key: string): Promise<void>
}

export interface QueuePort extends NodePressPort {
  enqueue<T>(name: string, payload: T, idempotencyKey?: string): Promise<string>
}

export interface SearchPort extends NodePressPort {
  index(index: string, id: string, document: Record<string, unknown>): Promise<void>
  search<T>(index: string, query: string): Promise<T[]>
}

export interface MailPort extends NodePressPort {
  send(message: { to: string, subject: string, text: string, html?: string }): Promise<void>
}

export interface WebhookPort extends NodePressPort {
  dispatch(url: string, event: Record<string, unknown>): Promise<void>
}

export interface InspectedPort extends PortHealth {
  id: string
  capabilities: readonly string[]
}

export async function inspectPort(port: NodePressPort, context: NodePressContext): Promise<InspectedPort> {
  const health = await port.health(context)
  return {
    id: port.id,
    capabilities: [...port.capabilities],
    ...health,
  }
}
