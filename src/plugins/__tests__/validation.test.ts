import { describe, expect, it } from 'vitest'
import type { NodePressPlugin } from '../types'
import { validatePluginManifest } from '../validation'

const validPlugin = (): NodePressPlugin => ({
  id: 'animals',
  name: 'Animals',
  version: '1.0.0',
  permissions: ['animals.read'],
  migrations: [
    {
      id: '001-create-animals',
      async up() {},
    },
  ],
  register() {},
})

describe('validatePluginManifest', () => {
  it('accepts a valid plugin manifest', () => {
    expect(() => validatePluginManifest(validPlugin())).not.toThrow()
  })

  it('rejects invalid plugin identifiers', () => {
    expect(() => validatePluginManifest({ ...validPlugin(), id: 'Animals Plugin' })).toThrow(/id/i)
  })

  it('rejects invalid versions', () => {
    expect(() => validatePluginManifest({ ...validPlugin(), version: 'latest' })).toThrow(/version/i)
  })

  it('rejects duplicate migration identifiers', () => {
    const plugin = validPlugin()
    plugin.migrations = [
      ...(plugin.migrations ?? []),
      { id: '001-create-animals', async up() {} },
    ]

    expect(() => validatePluginManifest(plugin)).toThrow(/migration/i)
  })
})
