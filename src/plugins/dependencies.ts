import { validatePluginManifest } from './validation'
import type { NodePressPlugin } from './types'

export const NODEPRESS_ENGINE_VERSION = '1.0.0'

export function resolvePluginOrder(
  plugins: NodePressPlugin[],
  nodePressVersion: string = NODEPRESS_ENGINE_VERSION,
): NodePressPlugin[] {
  const byId = new Map<string, NodePressPlugin>()
  for (const plugin of plugins) {
    validatePluginManifest(plugin)
    if (byId.has(plugin.id)) throw new Error(`Duplicate plugin id: ${plugin.id}`)
    if (plugin.engine?.nodepress && !satisfies(nodePressVersion, plugin.engine.nodepress)) {
      throw new Error(`Plugin ${plugin.id} is incompatible with NodePress ${nodePressVersion}`)
    }
    byId.set(plugin.id, plugin)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const ordered: NodePressPlugin[] = []
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Plugin dependency cycle detected at: ${id}`)
    if (visited.has(id)) return
    const plugin = byId.get(id)
    if (!plugin) throw new Error(`Missing plugin dependency: ${id}`)
    visiting.add(id)
    for (const [dependencyId, range] of Object.entries(plugin.dependencies ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const dependency = byId.get(dependencyId)
      if (!dependency) throw new Error(`Missing plugin dependency: ${plugin.id} -> ${dependencyId}`)
      if (!satisfies(dependency.version, range)) {
        throw new Error(`Incompatible plugin dependency: ${plugin.id} requires ${dependencyId} ${range}`)
      }
      visit(dependencyId)
    }
    visiting.delete(id)
    visited.add(id)
    ordered.push(plugin)
  }

  for (const plugin of [...plugins].sort((a, b) => a.id.localeCompare(b.id))) visit(plugin.id)
  return ordered
}

export function satisfies(version: string, range: string): boolean {
  const actual = parseVersion(version)
  const normalized = range.trim()
  if (normalized === '*' || normalized === '') return true
  if (normalized.startsWith('^')) {
    const minimum = parseVersion(normalized.slice(1))
    return actual.major === minimum.major && compare(actual, minimum) >= 0
  }
  if (normalized.startsWith('~')) {
    const minimum = parseVersion(normalized.slice(1))
    return actual.major === minimum.major && actual.minor === minimum.minor && compare(actual, minimum) >= 0
  }
  if (normalized.startsWith('>=')) return compare(actual, parseVersion(normalized.slice(2))) >= 0
  return compare(actual, parseVersion(normalized)) === 0
}

interface Version { major: number, minor: number, patch: number }

function parseVersion(value: string): Version {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) throw new Error(`Invalid version range: ${value}`)
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
}

function compare(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch
}
