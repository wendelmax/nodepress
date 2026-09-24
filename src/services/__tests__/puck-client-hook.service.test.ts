import { describe, expect, it } from 'vitest'
import React from 'react'
import type { PuckComponents } from '@/lib/puck/types'
import { ClientPuckHookService } from '../puck-client-hook.service'

describe('ClientPuckHookService', () => {
  it('applies filters in priority order and supports cleanup', async () => {
    const calls: string[] = []
    const lowPriorityCleanup = ClientPuckHookService.addFilter(
      'test_puck_components',
      (components) => {
        calls.push('low')
        return { ...components, Low: { render: () => React.createElement('div') } }
      },
      20,
    )
    const highPriorityCleanup = ClientPuckHookService.addFilter(
      'test_puck_components',
      (components) => {
        calls.push('high')
        return { ...components, High: { render: () => React.createElement('div') } }
      },
      10,
    )

    await expect(
      ClientPuckHookService.applyFilters('test_puck_components', {} as PuckComponents),
    ).resolves.toHaveProperty('High')
    expect(calls).toEqual(['high', 'low'])

    highPriorityCleanup()
    lowPriorityCleanup()
    await expect(
      ClientPuckHookService.applyFilters('test_puck_components', {} as PuckComponents),
    ).resolves.toEqual({})
  })
})
