import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HookService } from '@/services/hook.service'
import { getClientPuckConfig } from '../client-config'

vi.mock('@/plugins/registry', () => ({
  registeredPlugins: [
    {
      id: 'active',
      puck: { components: { Card: { render: () => React.createElement('article') } } },
    },
    {
      id: 'inactive',
      puck: { components: { Secret: { render: () => React.createElement('aside') } } },
    },
  ],
}))

describe('client Puck config resolver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('merges active plugin components and applies the browser filter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      plugins: [
        { id: 'active', active: true },
        { id: 'inactive', active: false },
      ],
    }), { status: 200 })))
    const cleanup = HookService.addFilter('puck_registered_components', (components) => ({
      ...components,
      Filtered: components.Card,
    }))

    const config = await getClientPuckConfig()

    cleanup()
    expect(config.components).toHaveProperty('Card')
    expect(config.components).toHaveProperty('Filtered')
    expect(config.components).not.toHaveProperty('Secret')
  })

  it('rejects when the active plugin endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(getClientPuckConfig()).rejects.toThrow('network down')
  })
})
