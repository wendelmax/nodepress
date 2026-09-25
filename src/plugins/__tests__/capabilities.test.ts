import { beforeEach, describe, expect, it } from 'vitest'
import { MenuService } from '@/services/menu.service'
import { NodePressPluginRuntime } from '../runtime'
import type { NodePressPlugin, PluginContext } from '../types'

describe('plugin capabilities', () => {
  beforeEach(() => {
    MenuService.clearPluginMenus()
  })

  it('exposes declared capabilities and denies undeclared requirements', async () => {
    let capabilities: PluginContext['capabilities'] | undefined
    const plugin: NodePressPlugin = {
      id: 'reports',
      name: 'Reports',
      version: '1.0.0',
      permissions: ['reports.read', 'reports.manage'],
      register(context) {
        capabilities = context.capabilities
      },
    }

    await new NodePressPluginRuntime().activate(plugin)

    expect(capabilities?.list()).toEqual(['reports.read', 'reports.manage'])
    expect(capabilities?.has('reports.read')).toBe(true)
    expect(capabilities?.has('reports.delete')).toBe(false)
    expect(() => capabilities?.require('reports.read')).not.toThrow()
    expect(() => capabilities?.require('reports.delete')).toThrow(
      'Plugin capability denied: reports -> reports.delete',
    )
  })

  it('requires menu capabilities to be declared by the plugin', async () => {
    const plugin: NodePressPlugin = {
      id: 'reports',
      name: 'Reports',
      version: '1.0.0',
      permissions: ['reports.read'],
      register({ menus }) {
        menus.addAdmin({
          id: 'reports-admin',
          label: 'Reports',
          capability: 'reports.manage',
        })
      },
    }

    await expect(new NodePressPluginRuntime().activate(plugin)).rejects.toThrow(
      'Plugin capability denied: reports -> reports.manage',
    )
    expect(MenuService.getPluginMenuTree('admin', () => true)).toEqual([])
  })

  it('validates capabilities on nested menu contributions', async () => {
    const plugin: NodePressPlugin = {
      id: 'reports',
      name: 'Reports',
      version: '1.0.0',
      permissions: ['reports.read'],
      register({ menus }) {
        menus.addAdmin({
          id: 'reports-admin',
          label: 'Reports',
          children: [{
            id: 'reports-settings',
            label: 'Settings',
            capability: 'reports.manage',
          }],
        })
      },
    }

    await expect(new NodePressPluginRuntime().activate(plugin)).rejects.toThrow(
      'Plugin capability denied: reports -> reports.manage',
    )
    expect(MenuService.getPluginMenuTree('admin', () => true)).toEqual([])
  })
})
