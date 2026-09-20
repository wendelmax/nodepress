const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

export type ModuleHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ModuleHealth {
  status: ModuleHealthStatus
  details?: Record<string, unknown>
}

export interface NodePressModule {
  id: string
  version: string
  dependencies?: string[]
  start(context: import('../context').NodePressContext): void | Promise<void>
  stop(context: import('../context').NodePressContext): void | Promise<void>
  health(context: import('../context').NodePressContext): Promise<ModuleHealth>
}

export function validateModule(module: NodePressModule): void {
  if (!module || typeof module !== 'object') throw new Error('Invalid module manifest')
  if (!IDENTIFIER_PATTERN.test(module.id)) throw new Error(`Invalid module id: ${module.id}`)
  if (!VERSION_PATTERN.test(module.version)) throw new Error(`Invalid module version: ${module.version}`)
  if (typeof module.start !== 'function' || typeof module.stop !== 'function') {
    throw new Error(`Invalid lifecycle handlers for module: ${module.id}`)
  }
  if (typeof module.health !== 'function') throw new Error(`Invalid health handler for module: ${module.id}`)
  if (new Set(module.dependencies ?? []).size !== (module.dependencies ?? []).length) {
    throw new Error(`Duplicate module dependency for: ${module.id}`)
  }
}

export function resolveModuleOrder(modules: NodePressModule[]): NodePressModule[] {
  const byId = new Map<string, NodePressModule>()
  for (const module of modules) {
    validateModule(module)
    if (byId.has(module.id)) throw new Error(`Duplicate module id: ${module.id}`)
    byId.set(module.id, module)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const ordered: NodePressModule[] = []

  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Module dependency cycle detected at: ${id}`)
    if (visited.has(id)) return
    const module = byId.get(id)
    if (!module) throw new Error(`Missing module dependency: ${id}`)
    visiting.add(id)
    for (const dependency of [...(module.dependencies ?? [])].sort()) visit(dependency)
    visiting.delete(id)
    visited.add(id)
    ordered.push(module)
  }

  for (const module of [...modules].sort((a, b) => a.id.localeCompare(b.id))) visit(module.id)
  return ordered
}
