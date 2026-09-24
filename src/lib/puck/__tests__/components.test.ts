import React from 'react'
import { describe, expect, it } from 'vitest'
import type { NodePressPlugin } from '@/plugins/types'
import type { PuckComponents } from '../types'
import { mergePuckComponents } from '../components'

describe('Puck component contributions', () => {
  it('merges only active plugin components without mutating the base map', () => {
    const base = {
      Heading: { render: () => React.createElement('h1') },
    } as PuckComponents
    const plugins = [
      {
        id: 'active',
        puck: {
          components: {
            Heading: { render: () => React.createElement('h2') },
            Card: { render: () => React.createElement('article') },
          },
        },
      },
      {
        id: 'inactive',
        puck: {
          components: {
            Secret: { render: () => React.createElement('aside') },
          },
        },
      },
    ] as NodePressPlugin[]

    const merged = mergePuckComponents(base, plugins, new Set(['active']))

    expect(merged).toHaveProperty('Card')
    expect(merged).not.toHaveProperty('Secret')
    expect(merged.Heading).not.toBe(base.Heading)
    expect(base).not.toHaveProperty('Card')
    expect(base).not.toHaveProperty('Secret')
  })
})
