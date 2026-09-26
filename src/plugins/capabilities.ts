export interface PluginCapabilities {
  has(permission: string): boolean
  require(permission: string): void
  list(): readonly string[]
}

export function createPluginCapabilities(
  pluginId: string,
  permissions: readonly string[] = [],
): PluginCapabilities {
  const declared = [...new Set(permissions)]
  const permissionSet = new Set(declared)

  return {
    has(permission: string): boolean {
      return permissionSet.has(permission)
    },
    require(permission: string): void {
      if (!permissionSet.has(permission)) {
        throw new Error(`Plugin capability denied: ${pluginId} -> ${permission}`)
      }
    },
    list(): readonly string[] {
      return [...declared]
    },
  }
}
