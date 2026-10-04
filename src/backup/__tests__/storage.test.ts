import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalBackupStorage } from '@/backup/storage'

describe('LocalBackupStorage', () => {
  it('writes, reads and deletes a backup outside the public directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nodepress-backup-'))
    try {
      const storage = new LocalBackupStorage(root)
      const key = await storage.write('daily/backup.json', Buffer.from('{"ok":true}'), 'application/json')

      expect(key).toBe('daily/backup.json')
      expect(await storage.read(key)).toEqual(Buffer.from('{"ok":true}'))
      expect(await readFile(join(root, key), 'utf8')).toBe('{"ok":true}')

      await storage.delete(key)
      expect(await storage.read(key)).toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects path traversal for every storage operation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nodepress-backup-'))
    try {
      const storage = new LocalBackupStorage(root)

      await expect(storage.write('../escape.json', Buffer.from('nope'), 'application/json')).rejects.toThrow(/path traversal/i)
      await expect(storage.read('../escape.json')).rejects.toThrow(/path traversal/i)
      await expect(storage.delete('../escape.json')).rejects.toThrow(/path traversal/i)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
