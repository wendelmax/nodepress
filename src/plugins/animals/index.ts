import type { NodePressPlugin } from '../types'
import { createAnimalsMigration } from './migrations/001_create_animals'

export const animalsPlugin: NodePressPlugin = {
  id: 'animals',
  name: 'Animais',
  version: '1.0.0',
  permissions: ['animals.read', 'animals.manage'],
  migrations: [createAnimalsMigration],
  register({ menus }) {
    menus.addAdmin({
      id: 'animals',
      label: 'Animais',
      href: '/admin/animals',
      icon: 'PawPrint',
      capability: 'animals.read',
      position: 30,
    })
    menus.addPublic({
      id: 'animals-public',
      label: 'Animais',
      href: '/animais',
      icon: 'PawPrint',
      position: 30,
    })
  },
}

export default animalsPlugin
