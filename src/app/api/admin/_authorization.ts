import { auth } from '@/auth'
import { hasMigrationPermission, type MigrationPermission } from '@/migrations/legacy-bridge/admin-policy'

export async function requireMigrationPermission(permission: MigrationPermission) {
  const session = await auth()
  if (!session?.user) return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const user = session.user as { id?: string | number; role?: string }
  if (!hasMigrationPermission(user.role, permission)) {
    return { response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { actor: { id: String(user.id ?? 'system'), role: user.role } }
}
