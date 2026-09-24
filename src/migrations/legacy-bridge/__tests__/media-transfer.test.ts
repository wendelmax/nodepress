import { describe, expect, it } from 'vitest'
import { MediaTransfer, type MediaMapping, type MediaMappingStore } from '../media-transfer'
import type { ObjectStoragePort, PortHealth } from '@/core/ports'
import type { NodePressContext } from '@/core/context'

describe('legacy media transfer', () => {
  it('reuses an object with the same checksum', async () => {
    const storage = new MemoryStorage()
    const mappings = new MemoryMappings()
    const transfer = new MediaTransfer(storage, mappings)
    const bytes = new TextEncoder().encode('image-content')

    const first = await transfer.transfer({ legacyId: 'media-1', bytes, contentType: 'image/png' })
    const second = await transfer.transfer({ legacyId: 'media-1', bytes, contentType: 'image/png', checksum: first.checksum })

    expect(first.reused).toBe(false)
    expect(second.reused).toBe(true)
    expect(storage.putCalls).toBe(1)
  })

  it('does not record a completed mapping when upload fails', async () => {
    const storage = new MemoryStorage()
    storage.failNextPut = true
    const mappings = new MemoryMappings()
    const transfer = new MediaTransfer(storage, mappings)

    await expect(transfer.transfer({ legacyId: 'media-1', bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png' }))
      .rejects.toThrow('storage upload failed')
    expect(await mappings.find('media-1')).toBeUndefined()
  })

  it('rejects content whose checksum does not match the export contract', async () => {
    const transfer = new MediaTransfer(new MemoryStorage(), new MemoryMappings())

    await expect(transfer.transfer({
      legacyId: 'media-1',
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'image/png',
      checksum: 'sha256:wrong',
    })).rejects.toThrow('Media checksum mismatch')
  })

  it('cleans up a newly uploaded object when mapping persistence fails', async () => {
    const storage = new MemoryStorage()
    const mappings = new MemoryMappings()
    mappings.failNextSave = true
    const transfer = new MediaTransfer(storage, mappings)
    const input = { legacyId: 'media-2', bytes: new Uint8Array([4, 5, 6]), contentType: 'image/png' }

    await expect(transfer.transfer(input)).rejects.toThrow('mapping save failed')
    expect(await storage.get('legacy-media/media-2')).toBeUndefined()
  })
})

class MemoryStorage implements ObjectStoragePort {
  readonly id = 'storage.test'
  readonly capabilities = ['put', 'get', 'delete'] as const
  readonly values = new Map<string, Uint8Array>()
  putCalls = 0
  failNextPut = false

  async put(key: string, content: Uint8Array): Promise<void> {
    this.putCalls += 1
    if (this.failNextPut) {
      this.failNextPut = false
      throw new Error('storage upload failed')
    }
    this.values.set(key, new Uint8Array(content))
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const value = this.values.get(key)
    return value ? new Uint8Array(value) : undefined
  }

  async delete(key: string): Promise<void> { this.values.delete(key) }
  async health(_context: NodePressContext): Promise<PortHealth> { return { status: 'healthy' } }
}

class MemoryMappings implements MediaMappingStore {
  records: MediaMapping[] = []
  failNextSave = false

  async find(legacyId: string): Promise<MediaMapping | undefined> {
    return this.records.find((record) => record.legacyId === legacyId)
  }

  async save(mapping: MediaMapping): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false
      throw new Error('mapping save failed')
    }
    this.records = [...this.records.filter((record) => record.legacyId !== mapping.legacyId), mapping]
  }
}
