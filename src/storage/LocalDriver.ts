import { writeFile, unlink } from 'fs/promises'
import { mkdirSync } from 'fs'
import path from 'path'
import type { StorageDriver } from './StorageDriver'

/**
 * LocalDriver — Stores files on the local filesystem under `public/uploads/`.
 *
 * Best for development and single-server deployments. Files are served
 * directly by Next.js from the public directory at `/uploads/<filename>`.
 */
export class LocalDriver implements StorageDriver {
  private uploadDir: string

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads')
    // Ensure the directory exists (won't throw if it already does)
    mkdirSync(this.uploadDir, { recursive: true })
  }

  /**
   * Writes the buffer to disk and returns the public relative URL.
   */
  async upload(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename)
    await writeFile(filePath, buffer)
    return `/uploads/${filename}`
  }

  /**
   * Deletes the file from disk using the stored public URL.
   * Silently ignores ENOENT (file already gone).
   */
  async delete(fileUrl: string): Promise<void> {
    // Extract filename from URL like "/uploads/photo-a1b2.jpg"
    const filename = path.basename(fileUrl)
    const filePath = path.join(this.uploadDir, filename)
    try {
      await unlink(filePath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
    }
  }
}
