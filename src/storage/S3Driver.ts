import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import type { StorageDriver } from './StorageDriver'

export interface S3DriverConfig {
  /** AWS Access Key ID or equivalent provider key */
  accessKeyId: string
  /** AWS Secret Access Key or equivalent provider secret */
  secretAccessKey: string
  /** S3 bucket name */
  bucket: string
  /** AWS region (e.g. "us-east-1") or provider region */
  region: string
  /** Optional: custom endpoint for S3-compatible providers (R2, MinIO, Spaces) */
  endpoint?: string
  /** Optional: custom public base URL (e.g. CDN or public bucket domain) */
  publicUrl?: string
}

/**
 * S3Driver — Stores files in any S3-compatible object storage.
 *
 * Works with:
 *  - Amazon S3 (native)
 *  - Cloudflare R2 (set endpoint to `https://<account_id>.r2.cloudflarestorage.com`)
 *  - MinIO (set endpoint to your MinIO server URL)
 *  - DigitalOcean Spaces (set endpoint to `https://<region>.digitaloceanspaces.com`)
 *  - Backblaze B2 (set endpoint to `https://s3.<region>.backblazeb2.com`)
 */
export class S3Driver implements StorageDriver {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor(config: S3DriverConfig) {
    this.bucket = config.bucket

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Custom endpoint for non-AWS providers (R2, MinIO, etc.)
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    })

    // Build the base URL for public access
    if (config.publicUrl) {
      // Explicit CDN / custom domain configured by user
      this.publicUrl = config.publicUrl.replace(/\/$/, '')
    } else if (config.endpoint) {
      // Custom endpoint (MinIO, R2, etc.): <endpoint>/<bucket>
      this.publicUrl = `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`
    } else {
      // Standard AWS S3: https://<bucket>.s3.<region>.amazonaws.com
      this.publicUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com`
    }
  }

  /**
   * Upload a file to S3 and return its public URL.
   */
  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
        // For public-read buckets (common for media assets)
        ACL: 'public-read',
      })
    )
    return `${this.publicUrl}/${filename}`
  }

  /**
   * Delete a file from S3 using its stored public URL.
   * Extracts the storage key from the URL suffix.
   */
  async delete(fileUrl: string): Promise<void> {
    // Extract the S3 key from the full URL
    // e.g. "https://bucket.s3.us-east-1.amazonaws.com/photo-a1b2.jpg" → "photo-a1b2.jpg"
    const key = fileUrl.replace(`${this.publicUrl}/`, '')

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }
}
