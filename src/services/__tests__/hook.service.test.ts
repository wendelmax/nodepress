import { describe, expect, it } from 'vitest'
import { HookRegistry } from '../hook.service'

describe('HookRegistry', () => {
  it('stops invoking an action after its unsubscribe function is called', async () => {
    const registry = new HookRegistry()
    const calls: string[] = []
    const unsubscribe = registry.addAction('admin_menu', () => {
      calls.push('called')
    })

    await registry.doAction('admin_menu')
    unsubscribe()
    await registry.doAction('admin_menu')

    expect(calls).toEqual(['called'])
  })

  it('applies filters in priority order', async () => {
    const registry = new HookRegistry()
    registry.addFilter('title', (value: string) => `${value}-late`, 20)
    registry.addFilter('title', (value: string) => `${value}-early`, 10)

    await expect(registry.applyFilters('title', 'post')).resolves.toBe('post-early-late')
  })
})
