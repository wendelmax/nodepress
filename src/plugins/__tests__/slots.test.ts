import { beforeEach, describe, expect, it } from 'vitest'
import { HookService } from '@/services/hook.service'
import { NodePressPluginRuntime } from '../runtime'
import { renderPluginSlot } from '../slots'
import type { NodePressPlugin, PluginContext } from '../types'

describe('plugin slots', () => {
  beforeEach(() => {
    HookService.removeAction('plugin_slot:admin:reports.widget', () => undefined)
  })

  it('registers a typed slot and removes it when the runtime is deactivated', async () => {
    let context: PluginContext | undefined
    const plugin: NodePressPlugin = {
      id: 'reports',
      name: 'Reports',
      version: '1.0.0',
      permissions: ['slots.register', 'admin.pages'],
      register(received) {
        context = received
        received.slots.register({
          id: 'reports.widget',
          surface: 'admin',
          render: (props) => `reports:${String(props.title)}`,
        })
        received.adminPages.register({
          slug: 'reports-settings',
          label: 'Reports settings',
          render: () => 'settings-page',
        })
      },
    }
    const runtime = new NodePressPluginRuntime()

    await runtime.activate(plugin)
    await expect(renderPluginSlot('admin', 'reports.widget', { title: 'today' })).resolves.toEqual(['reports:today'])
    expect(context?.adminPages).toBeDefined()
    runtime.deactivate('reports')
    await expect(renderPluginSlot('admin', 'reports.widget', { title: 'today' })).resolves.toEqual([])
  })

  it('denies slot registration without the declared capability', async () => {
    const plugin: NodePressPlugin = {
      id: 'reports',
      name: 'Reports',
      version: '1.0.0',
      register({ slots }) {
        slots.register({ id: 'reports.widget', surface: 'admin', render: () => 'nope' })
      },
    }

    await expect(new NodePressPluginRuntime().activate(plugin)).rejects.toThrow(
      'Plugin capability denied: reports -> slots.register',
    )
  })
})
