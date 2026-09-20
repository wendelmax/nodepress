import { createDomainEvent, type NodePressDomainEvent, type NodePressEventHandler } from './types'
import { createNodePressContext, type NodePressContext } from '../context'

export class NodePressEventRegistry {
  private readonly handlers = new Map<string, NodePressEventHandler[]>()

  on<TPayload>(name: string, handler: NodePressEventHandler<TPayload>): () => void {
    const handlers = this.handlers.get(name) ?? []
    handlers.push(handler as NodePressEventHandler)
    this.handlers.set(name, handlers)
    let removed = false
    return () => {
      if (removed) return
      removed = true
      const remaining = (this.handlers.get(name) ?? []).filter((candidate) => candidate !== handler)
      if (remaining.length === 0) this.handlers.delete(name)
      else this.handlers.set(name, remaining)
    }
  }

  async emit<TPayload>(name: string, payload: TPayload, context?: NodePressContext): Promise<void> {
    const event = createDomainEvent(name, payload, context ?? createNodePressContext())
    for (const handler of [...(this.handlers.get(name) ?? [])]) await handler(event)
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const eventRegistry = new NodePressEventRegistry()

export type { NodePressDomainEvent, NodePressEventHandler }
