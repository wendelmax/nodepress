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

export class RuntimeRegistry<T extends { id: string }> {
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

  get(id: string): T | undefined {
    return this.entries.get(id)
  }

  clear(): void {
    this.entries.clear()
  }
}

export const jobRegistry = new RuntimeRegistry<PluginJobDefinition>()
export const commandRegistry = new RuntimeRegistry<PluginCommandDefinition>()

export function normalizePluginRoutePath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) throw new Error('Plugin route path must start with /')
  if (trimmed === '/') return trimmed
  return trimmed.replace(/\/+$/, '')
}

export class PluginRouteRegistry extends RuntimeRegistry<PluginRouteDefinition> {
  override add(entry: PluginRouteDefinition): () => void {
    const normalizedEntry = { ...entry, path: normalizePluginRoutePath(entry.path) }
    const conflict = this.list().find((registered) => (
      registered.method === normalizedEntry.method
      && normalizePluginRoutePath(registered.path) === normalizedEntry.path
    ))
    if (conflict) {
      throw new Error(`Route already registered: ${normalizedEntry.method} ${normalizedEntry.path}`)
    }
    return super.add(normalizedEntry)
  }

  find(method: PluginRouteDefinition['method'], path: string): PluginRouteDefinition | undefined {
    const normalizedPath = normalizePluginRoutePath(path)
    return this.list().find((route) => route.method === method && route.path === normalizedPath)
  }
}

export const routeRegistry = new PluginRouteRegistry()
