import { createHash } from 'node:crypto'
import type { ObjectStoragePort } from '@/core/ports'

export interface MediaMapping {
  legacyId: string
  key: string
  checksum: string
  contentType: string
}

export interface MediaMappingStore {
  find(legacyId: string): Promise<MediaMapping | undefined>
  save(mapping: MediaMapping): Promise<void>
}

export interface MediaTransferInput {
  legacyId: string
  bytes: Uint8Array
  contentType: string
  checksum?: string
}

export interface MediaTransferResult {
  key: string
  checksum: string
  reused: boolean
}

export class MediaTransfer {
  constructor(
    private readonly storage: ObjectStoragePort,
    private readonly mappings: MediaMappingStore,
  ) {}

  async transfer(input: MediaTransferInput): Promise<MediaTransferResult> {
    const checksum = checksumFor(input.bytes)
    if (input.checksum && input.checksum !== checksum) throw new Error('Media checksum mismatch')

    const existing = await this.mappings.find(input.legacyId)
    const key = existing?.key ?? mediaKey(input.legacyId)
    if (existing?.checksum === checksum && existing.contentType === input.contentType) {
      const stored = await this.storage.get(key)
      if (stored && checksumFor(stored) === checksum) return { key, checksum, reused: true }
    }

    await this.storage.put(key, input.bytes, input.contentType)
    const stored = await this.storage.get(key)
    if (!stored || checksumFor(stored) !== checksum) {
      if (!existing) await this.storage.delete(key)
      throw new Error('Media storage verification failed')
    }

    try {
      await this.mappings.save({ legacyId: input.legacyId, key, checksum, contentType: input.contentType })
    } catch (error) {
      if (!existing) await this.storage.delete(key)
      throw error
    }
    return { key, checksum, reused: false }
  }
}

function checksumFor(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

function mediaKey(legacyId: string): string {
  return `legacy-media/${encodeURIComponent(legacyId)}`
}
