import { auth } from '@/auth'
import { getPluginService } from '@/services/plugin-factory'

export async function requireAdmin() {
  const session = await auth()
  const role = session?.user ? (session.user as { role?: string }).role : undefined
  if (role !== 'admin') {
    return { response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { service: await getPluginService() }
}
