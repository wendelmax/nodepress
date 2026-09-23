import { randomUUID } from 'node:crypto'
import type { NodePressContext } from '../context'

export interface NodePressDomainEvent<TPayload = unknown> {
  id: string
  name: string
  payload: TPayload
  context: NodePressContext
  occurredAt: Date
}

export type NodePressEventHandler<TPayload = unknown> =
  (event: NodePressDomainEvent<TPayload>) => void | Promise<void>

export function createDomainEvent<TPayload>(
  name: string,
  payload: TPayload,
  context: NodePressContext,
): NodePressDomainEvent<TPayload> {
  if (!name.trim()) throw new Error('Event name is required')
  return Object.freeze({
    id: randomUUID(),
    name,
    payload,
    context,
    occurredAt: new Date(),
  })
}
