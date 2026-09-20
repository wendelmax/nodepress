import { describe, expect, it, vi } from 'vitest'
import { animalsPlugin } from '../animals'
import { registeredPlugins } from '../registry'

describe('animals plugin', () => {
  it('is registered and contributes admin and public menus', async () => {
    expect(registeredPlugins).toContain(animalsPlugin)

    const menus = {
      addAdmin: vi.fn(() => vi.fn()),
      addPublic: vi.fn(() => vi.fn()),
    }

    await animalsPlugin.register({
      pluginId: animalsPlugin.id,
      hooks: { addAction: vi.fn(() => vi.fn()), addFilter: vi.fn(() => vi.fn()) },
      menus,
    })

    expect(menus.addAdmin).toHaveBeenCalledWith(expect.objectContaining({
      id: 'animals',
      label: 'Animais',
      href: '/admin/animals',
      capability: 'animals.read',
    }))
    expect(menus.addPublic).toHaveBeenCalledWith(expect.objectContaining({
      id: 'animals-public',
      label: 'Animais',
      href: '/animais',
    }))
  })

  it('declares a repeatable migration for the animals table', () => {
    expect(animalsPlugin.migrations).toHaveLength(1)
    expect(animalsPlugin.migrations?.[0]?.id).toBe('001-create-animals')
  })
})
