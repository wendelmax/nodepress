import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { NodePressContext } from '@/core/context'
import type { ObjectStoragePort, PortHealth } from '@/core/ports'

export class LocalFileObjectStoragePort implements ObjectStoragePort {
  readonly id = 'storage.local-filesystem'
  readonly capabilities = ['put', 'get', 'delete', 'persistent'] as const
  private readonly root: string

  constructor(root: string) { this.root = resolve(root) }

  async put(key: string, content: Uint8Array, _contentType: string): Promise<void> {
    const filePath = this.resolveKey(key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    try { return new Uint8Array(await readFile(this.resolveKey(key))) } catch (error) {
      if (isMissingFile(error)) return undefined
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    try { await rm(this.resolveKey(key)) } catch (error) {
      if (!isMissingFile(error)) throw error
    }
  }

  async health(_context: NodePressContext): Promise<PortHealth> {
    await mkdir(this.root, { recursive: true })
    return { status: 'healthy', details: { root: this.root } }
  }

  private resolveKey(key: string): string {
    if (!key || key.includes('\0')) throw new Error('Invalid storage key')
    const filePath = resolve(this.root, key)
    if (filePath !== this.root && !filePath.startsWith(`${this.root}${sep}`)) throw new Error('Invalid storage key: path traversal')
    return filePath
  }
}

function isMissingFile(error: unknown): boolean { return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') }
