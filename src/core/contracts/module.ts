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

export function validateModule(moduleDefinition: NodePressModule): void {
  if (!moduleDefinition || typeof moduleDefinition !== 'object') throw new Error('Invalid module manifest')
  if (!IDENTIFIER_PATTERN.test(moduleDefinition.id)) throw new Error(`Invalid module id: ${moduleDefinition.id}`)
  if (!VERSION_PATTERN.test(moduleDefinition.version)) throw new Error(`Invalid module version: ${moduleDefinition.version}`)
  if (typeof moduleDefinition.start !== 'function' || typeof moduleDefinition.stop !== 'function') {
    throw new Error(`Invalid lifecycle handlers for module: ${moduleDefinition.id}`)
  }
  if (typeof moduleDefinition.health !== 'function') throw new Error(`Invalid health handler for module: ${moduleDefinition.id}`)
  if (new Set(moduleDefinition.dependencies ?? []).size !== (moduleDefinition.dependencies ?? []).length) {
    throw new Error(`Duplicate module dependency for: ${moduleDefinition.id}`)
  }
}

export function resolveModuleOrder(modules: NodePressModule[]): NodePressModule[] {
  const byId = new Map<string, NodePressModule>()
  for (const moduleDefinition of modules) {
    validateModule(moduleDefinition)
    if (byId.has(moduleDefinition.id)) throw new Error(`Duplicate module id: ${moduleDefinition.id}`)
    byId.set(moduleDefinition.id, moduleDefinition)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const ordered: NodePressModule[] = []

  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Module dependency cycle detected at: ${id}`)
    if (visited.has(id)) return
    const moduleDefinition = byId.get(id)
    if (!moduleDefinition) throw new Error(`Missing module dependency: ${id}`)
    visiting.add(id)
    for (const dependency of [...(moduleDefinition.dependencies ?? [])].sort()) visit(dependency)
    visiting.delete(id)
    visited.add(id)
    ordered.push(moduleDefinition)
  }

  for (const moduleDefinition of [...modules].sort((a, b) => a.id.localeCompare(b.id))) visit(moduleDefinition.id)
  return ordered
}
