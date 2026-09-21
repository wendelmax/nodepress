import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LocalFileObjectStoragePort } from '../local-storage'

describe('LocalFileObjectStoragePort', () => {
  it('stores files below its configured root and rejects traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nodepress-storage-'))
    try {
      const storage = new LocalFileObjectStoragePort(root)
      await storage.put('media/hello.txt', new TextEncoder().encode('hello'), 'text/plain')
      expect(new TextDecoder().decode(await storage.get('media/hello.txt') as Uint8Array)).toBe('hello')
      await expect(storage.put('../outside.txt', new Uint8Array([1]), 'application/octet-stream')).rejects.toThrow(/invalid storage key/i)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
