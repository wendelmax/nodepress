import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { StorageDriver } from '@/storage/StorageDriver'

export interface BackupStorage {
  read(key: string): Promise<Buffer | undefined>
  write(key: string, content: Uint8Array, contentType: string): Promise<string>
  delete(key: string): Promise<void>
}

export class LocalBackupStorage implements BackupStorage {
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  async read(key: string): Promise<Buffer | undefined> {
    try {
      return await readFile(this.resolveKey(key))
    } catch (error) {
      if (isMissingFile(error)) return undefined
      throw error
    }
  }

  async write(key: string, content: Uint8Array, _contentType: string): Promise<string> {
    const filePath = this.resolveKey(key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
    return key
  }

  async delete(key: string): Promise<void> {
    try {
      await rm(this.resolveKey(key))
    } catch (error) {
      if (!isMissingFile(error)) throw error
    }
  }

  private resolveKey(key: string): string {
    if (!key || key.includes('\0')) throw new Error('Invalid backup storage key')
    const filePath = resolve(this.root, key)
    if (filePath !== this.root && !filePath.startsWith(`${this.root}${sep}`)) {
      throw new Error('Invalid backup storage key: path traversal')
    }
    return filePath
  }
}

export function createDriverBackupStorage(driver: StorageDriver): BackupStorage {
  return {
    read: (key) => driver.read(key),
    write: (key, content, contentType) => driver.upload(Buffer.from(content), key, contentType),
    delete: (key) => driver.delete(key),
  }
}

function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}
