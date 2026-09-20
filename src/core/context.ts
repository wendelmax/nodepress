import { randomUUID } from 'node:crypto'

export interface NodePressActor {
  id: string
  role?: string
}

export interface NodePressContext {
  requestId: string
  tenantId?: string
  actor?: NodePressActor
  locale?: string
  metadata: Readonly<Record<string, string>>
}

export type NodePressContextInput = Omit<NodePressContext, 'requestId' | 'metadata'> & {
  requestId?: string
  metadata?: Record<string, string>
}

export function createNodePressContext(input: NodePressContextInput = {}): NodePressContext {
  return Object.freeze({
    ...input,
    requestId: input.requestId ?? randomUUID(),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  })
}

export function deriveNodePressContext(
  parent: NodePressContext,
  changes: Partial<Omit<NodePressContext, 'requestId' | 'metadata'>> & {
    metadata?: Record<string, string>
  } = {},
): NodePressContext {
  return createNodePressContext({
    ...parent,
    ...changes,
    requestId: parent.requestId,
    metadata: { ...parent.metadata, ...(changes.metadata ?? {}) },
  })
}
