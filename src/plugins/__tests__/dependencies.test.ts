import { describe, expect, it } from 'vitest'
import { resolvePluginOrder } from '../dependencies'
import type { NodePressPlugin } from '../types'

describe('plugin dependency graph', () => {
  it('orders dependencies before dependants', () => {
    const plugins = [plugin('animals', { content: '^1.0.0' }), plugin('content')]
    expect(resolvePluginOrder(plugins, '1.0.0').map((item) => item.id)).toEqual(['content', 'animals'])
  })

  it('rejects missing, cyclic, and incompatible dependencies', () => {
    expect(() => resolvePluginOrder([plugin('animals', { content: '^1.0.0' })], '1.0.0'))
      .toThrow(/missing plugin dependency/i)
    expect(() => resolvePluginOrder([
      plugin('a', { b: '^1.0.0' }),
      plugin('b', { a: '^1.0.0' }),
    ], '1.0.0')).toThrow(/cycle/i)
    expect(() => resolvePluginOrder([plugin('animals', { content: '^2.0.0' }), plugin('content')], '1.0.0'))
      .toThrow(/incompatible/i)
  })
})

function plugin(id: string, dependencies?: Record<string, string>): NodePressPlugin {
  return { id, name: id, version: '1.0.0', dependencies, register() {} }
}
