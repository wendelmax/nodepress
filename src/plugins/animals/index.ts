import type { ContentTypeDefinition } from '@/modules/content'
import type { NodePressPlugin } from '../types'
import { createAnimalsMigration } from './migrations/001_create_animals'

export const animalContentType: ContentTypeDefinition = {
  id: 'animal',
  label: 'Animal',
  version: '1.0.0',
  fields: {
    name: { type: 'text', required: true },
    species: { type: 'text' },
    status: { type: 'select', required: true, options: ['available', 'adopted', 'foster'] },
    weight: { type: 'number' },
  },
}

export const animalsPlugin: NodePressPlugin = {
  id: 'animals',
  name: 'Animais',
  version: '1.0.0',
  permissions: ['animals.read', 'animals.manage'],
  migrations: [createAnimalsMigration],
  register({ menus, contentTypes }) {
    contentTypes.register(animalContentType)
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
