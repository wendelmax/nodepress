import { describe, expect, it } from 'vitest'
import { createNodePressContext } from '@/core/context'
import { InMemoryCachePort, InProcessQueuePort, InMemoryObjectStoragePort } from '../in-memory-adapters'

const context = createNodePressContext({ requestId: 'test-request' })

describe('in-process infrastructure adapters', () => {
  it('expires cache values by TTL and reports capabilities', async () => {
    let now = 1_000
    const cache = new InMemoryCachePort(() => now)
    await cache.set('key', { value: 1 }, 10)

    expect(await cache.get('key')).toEqual({ value: 1 })
    now += 10_001
    expect(await cache.get('key')).toBeUndefined()
    expect(await cache.health(context)).toMatchObject({ status: 'healthy' })
    expect(cache.capabilities).toContain('ttl')
  })

  it('copies binary storage values and isolates caller mutation', async () => {
    const storage = new InMemoryObjectStoragePort()
    const content = new Uint8Array([1, 2, 3])
    await storage.put('media/file.bin', content, 'application/octet-stream')
    content[0] = 9

    expect(await storage.get('media/file.bin')).toEqual(new Uint8Array([1, 2, 3]))
    await storage.delete('media/file.bin')
    expect(await storage.get('media/file.bin')).toBeUndefined()
  })

  it('deduplicates queue messages by idempotency key', async () => {
    const queue = new InProcessQueuePort()
    const first = await queue.enqueue('import', { id: 1 }, 'source:1')
    const second = await queue.enqueue('import', { id: 1 }, 'source:1')

    expect(second).toBe(first)
    expect(queue.pending()).toHaveLength(1)
    expect(await queue.health(context)).toMatchObject({ status: 'healthy' })
  })
})
