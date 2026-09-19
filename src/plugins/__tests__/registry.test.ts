import { describe, expect, it } from 'vitest'
import { getRegisteredPlugins, registeredPlugins } from '../registry'

describe('plugin registry', () => {
  it('exposes typed manifests and preserves legacy plugin loading', async () => {
    expect(Array.isArray(registeredPlugins)).toBe(true)
    await expect(getRegisteredPlugins()).resolves.toEqual(registeredPlugins)
  })
})
