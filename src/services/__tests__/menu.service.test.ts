import { beforeEach, describe, expect, it } from 'vitest'
import { MenuService } from '../menu.service'

describe('plugin menu aggregation', () => {
  beforeEach(() => {
    MenuService.clearPluginMenus()
  })

  it('orders items and nests children deterministically', () => {
    MenuService.registerPluginMenu('animals', {
      id: 'animals', label: 'Animais', surface: 'admin', position: 20, href: '/admin/animals',
    })
    MenuService.registerPluginMenu('animals', {
      id: 'animals-settings', label: 'Configurações', surface: 'admin', position: 5,
      parentId: 'animals', href: '/admin/animals/settings',
    })
    MenuService.registerPluginMenu('donations', {
      id: 'donations', label: 'Doações', surface: 'admin', position: 10, href: '/admin/donations',
    })

    expect(MenuService.getPluginMenuTree('admin', () => true)).toEqual([
      {
        id: 'donations', label: 'Doações', surface: 'admin', position: 10,
        href: '/admin/donations', pluginId: 'donations', children: [],
      },
      {
        id: 'animals', label: 'Animais', surface: 'admin', position: 20,
        href: '/admin/animals', pluginId: 'animals', children: [
          {
            id: 'animals-settings', label: 'Configurações', surface: 'admin', position: 5,
            parentId: 'animals', href: '/admin/animals/settings', pluginId: 'animals', children: [],
          },
        ],
      },
    ])
  })

  it('filters capability-protected items and keeps public items', () => {
    MenuService.registerPluginMenu('animals', {
      id: 'animals-admin', label: 'Animais', surface: 'admin', capability: 'animals.read',
    })
    MenuService.registerPluginMenu('animals', {
      id: 'animals-public', label: 'Adote', surface: 'public', capability: 'animals.read',
    })

    expect(MenuService.getPluginMenuTree('admin', () => false)).toEqual([])
    expect(MenuService.getPluginMenuTree('public', () => true)[0]?.id).toBe('animals-public')
  })

  it('deduplicates IDs by keeping the first valid contribution', () => {
    MenuService.registerPluginMenu('first', {
      id: 'shared', label: 'Primeiro', surface: 'admin', position: 1,
    })
    MenuService.registerPluginMenu('second', {
      id: 'shared', label: 'Segundo', surface: 'admin', position: 2,
    })

    expect(MenuService.getPluginMenuTree('admin', () => true)).toHaveLength(1)
    expect(MenuService.getPluginMenuTree('admin', () => true)[0]?.label).toBe('Primeiro')
  })

  it('rejects missing parents and cycles', () => {
    MenuService.registerPluginMenu('animals', {
      id: 'missing-child', label: 'Filho', surface: 'admin', parentId: 'missing',
    })
    expect(() => MenuService.getPluginMenuTree('admin', () => true)).toThrow(/parent/i)

    MenuService.clearPluginMenus()
    MenuService.registerPluginMenu('animals', {
      id: 'a', label: 'A', surface: 'admin', parentId: 'b',
    })
    MenuService.registerPluginMenu('animals', {
      id: 'b', label: 'B', surface: 'admin', parentId: 'a',
    })
    expect(() => MenuService.getPluginMenuTree('admin', () => true)).toThrow(/cycle/i)
  })
})
