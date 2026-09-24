export const migrationPermissions = ['migration.read', 'migration.run', 'cutover.prepare', 'cutover.activate'] as const
export type MigrationPermission = typeof migrationPermissions[number]

const rolePermissions: Record<string, readonly MigrationPermission[]> = {
  admin: migrationPermissions,
  editor: ['migration.read', 'cutover.prepare'],
}

export function hasMigrationPermission(role: string | undefined, permission: MigrationPermission): boolean {
  return role ? (rolePermissions[role] ?? []).includes(permission) : false
}
