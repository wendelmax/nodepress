import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import type { NodePressPlugin } from '@/plugins/types'
import { getServerPuckConfig } from '../server-config'
import { puckConfig } from '../config'

const mocks = vi.hoisted(() => ({
  ensureActivePluginsLoaded: vi.fn(),
  getPluginService: vi.fn(),
  getRegisteredPlugins: vi.fn(),
  applyFilters: vi.fn(),
}))

vi.mock('@/services/plugin-factory', () => ({
  ensureActivePluginsLoaded: mocks.ensureActivePluginsLoaded,
  getPluginService: mocks.getPluginService,
}))

vi.mock('@/plugins/registry', () => ({
  getRegisteredPlugins: mocks.getRegisteredPlugins,
}))

vi.mock('@/services/hook.service', () => ({
  HookService: { applyFilters: mocks.applyFilters },
}))

describe('server Puck config resolver', () => {
  it('loads active plugin components before applying the Puck filter', async () => {
    const activePlugin = {
      id: 'active',
      puck: { components: { Card: { render: () => React.createElement('article') } } },
    } as NodePressPlugin
    const inactivePlugin = {
      id: 'inactive',
      puck: { components: { Secret: { render: () => React.createElement('aside') } } },
    } as NodePressPlugin
    const seenKeys: string[] = []

    mocks.ensureActivePluginsLoaded.mockResolvedValue(undefined)
    mocks.getPluginService.mockResolvedValue({
      list: vi.fn().mockResolvedValue([
        { id: 'active', active: true },
        { id: 'inactive', active: false },
      ]),
    })
    mocks.getRegisteredPlugins.mockResolvedValue([activePlugin, inactivePlugin])
    mocks.applyFilters.mockImplementation(async (_tag, components) => {
      seenKeys.push(Object.keys(components).join(','))
      return { ...components, Filtered: components.Card }
    })

    const config = await getServerPuckConfig()

    expect(seenKeys[0]).toContain('Card')
    expect(seenKeys[0]).not.toContain('Secret')
    expect(config.components).toHaveProperty('Filtered')
    expect(puckConfig.components).not.toHaveProperty('Card')
    expect(mocks.ensureActivePluginsLoaded).toHaveBeenCalledOnce()
    expect(mocks.applyFilters).toHaveBeenCalledWith('puck_registered_components', expect.any(Object))
  })
})
