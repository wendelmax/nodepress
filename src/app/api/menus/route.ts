import { auth } from '@/auth'
import { getPluginService } from '@/services/plugin-factory'
import { MenuService } from '@/services/menu.service'
import type { PluginSurface } from '@/plugins/types'

export async function GET(request: Request) {
  const surface = new URL(request.url).searchParams.get('surface') as PluginSurface | null
  if (surface !== 'admin' && surface !== 'public') {
    return Response.json({ error: 'surface must be admin or public' }, { status: 400 })
  }

  const service = await getPluginService()
  await service.loadActive()
  const session = surface === 'admin' ? await auth() : null
  const role = session?.user ? (session.user as { role?: string }).role : undefined
  if (surface === 'admin' && role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const menus = MenuService.getPluginMenuTree(
    surface,
    (capability) => surface === 'public' ? !capability : role === 'admin',
  )
  return Response.json({ menus })
}
