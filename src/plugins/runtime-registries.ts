import type { NodePressContext } from '@/core/context'

export interface PluginJobDefinition {
  id: string
  handler(payload: unknown, context: NodePressContext): void | Promise<void>
}

export interface PluginRouteDefinition {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  handler(request: Request, context: NodePressContext): Response | Promise<Response>
}

export interface PluginCommandDefinition {
  id: string
  handler(args: Record<string, unknown>, context: NodePressContext): void | Promise<void>
}

class RuntimeRegistry<T extends { id: string }> {
  private readonly entries = new Map<string, T>()

  add(entry: T): () => void {
    if (!entry.id.trim()) throw new Error('Extension id is required')
    if (this.entries.has(entry.id)) throw new Error(`Extension already registered: ${entry.id}`)
    this.entries.set(entry.id, entry)
    let removed = false
    return () => {
      if (removed) return
      removed = true
      this.entries.delete(entry.id)
    }
  }

  list(): T[] {
    return [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id))
  }

  clear(): void {
    this.entries.clear()
  }
}

export const jobRegistry = new RuntimeRegistry<PluginJobDefinition>()
export const routeRegistry = new RuntimeRegistry<PluginRouteDefinition>()
export const commandRegistry = new RuntimeRegistry<PluginCommandDefinition>()
