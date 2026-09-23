import { describe, expect, it } from 'vitest'
import { createNodePressContext } from '@/core/context'
import type { NodePressPort } from '@/core/ports'
import { InMemoryCachePort, InMemoryObjectStoragePort, InProcessQueuePort } from '../in-memory-adapters'

function assertPortContract(port: NodePressPort): void {
  expect(port.id).toMatch(/^[a-z]+\.[a-z-]+$/)
  expect(port.capabilities.length).toBeGreaterThan(0)
}

describe('in-process port contracts', () => {
  it('keeps every default stateful adapter inspectable', async () => {
    const context = createNodePressContext()
    const ports = [new InMemoryCachePort(), new InMemoryObjectStoragePort(), new InProcessQueuePort()]

    for (const port of ports) {
      assertPortContract(port)
      await expect(port.health(context)).resolves.toMatchObject({ status: 'healthy' })
    }
  })
})
