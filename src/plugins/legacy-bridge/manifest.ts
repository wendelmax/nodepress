import type { NodePressPlugin } from '@/plugins/types'
import { migrationPermissions } from '@/migrations/legacy-bridge/admin-policy'

export const legacyBridgePlugin: NodePressPlugin = {
  id: 'nodepress-legacy-bridge',
  name: 'Migração NodePress',
  version: '1.0.0',
  permissions: [...migrationPermissions],
  register({ menus }) {
    menus.addAdmin({
      id: 'system',
      label: 'Sistema',
      href: '/admin/settings',
      capability: 'migration.read',
      position: 90,
    })
    menus.addAdmin({
      id: 'nodepress-migrations',
      label: 'Migração NodePress',
      href: '/admin/migrations',
      parentId: 'system',
      capability: 'migration.read',
      position: 10,
    })
    menus.addAdmin({
      id: 'nodepress-cutover',
      label: 'Cutover por domínio',
      href: '/admin/migrations/cutover',
      parentId: 'system',
      capability: 'cutover.prepare',
      position: 20,
    })
  },
}

export default legacyBridgePlugin
