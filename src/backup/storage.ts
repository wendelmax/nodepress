import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

export interface S3BackupStorageConfig {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  endpoint?: string
}

export class S3BackupStorage implements BackupStorage {
  private readonly client: S3Client

  constructor(private readonly config: S3BackupStorageConfig) {
    this.client = new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    })
  }

  async read(key: string): Promise<Buffer | undefined> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: normalizeObjectKey(key) }))
      const body = result.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined
      return body?.transformToByteArray ? Buffer.from(await body.transformToByteArray()) : undefined
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return undefined
      throw error
    }
  }

  async write(key: string, content: Uint8Array, contentType: string): Promise<string> {
    const normalizedKey = normalizeObjectKey(key)
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: normalizedKey,
      Body: content,
      ContentType: contentType,
    }))
    return normalizedKey
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: normalizeObjectKey(key) }))
  }
}

function normalizeObjectKey(key: string): string {
  if (!key || key.includes('\0') || key.startsWith('/') || key.split('/').includes('..')) throw new Error('Invalid backup storage key')
  return key
}

function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}
