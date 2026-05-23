import type { StorageDriver } from './StorageDriver'
import { LocalDriver } from './LocalDriver'
import { S3Driver } from './S3Driver'
import prisma from '@/lib/prisma'

const STORAGE_OPTION_KEYS = [
  'storage_driver',
  's3_access_key',
  's3_secret_key',
  's3_bucket',
  's3_region',
  's3_endpoint',
  's3_public_url',
]

/**
 * StorageDriverFactory
 *
 * Reads storage configuration from the `np_options` table and returns the
 * appropriate concrete driver. The instance is cached per-process so we
 * avoid repeated DB round-trips on every upload.
 *
 * Call `StorageDriverFactory.invalidate()` after saving new storage settings
 * so that the next request picks up the updated configuration.
 */
export class StorageDriverFactory {
  private static _cached: StorageDriver | null = null

  /**
   * Returns the active storage driver.
   * First call reads from DB; subsequent calls return the cached instance.
   */
  static async get(): Promise<StorageDriver> {
    if (this._cached) return this._cached

    const config = await this.loadConfig()
    const driver = config.storage_driver === 's3'
      ? this.buildS3Driver(config)
      : new LocalDriver()

    this._cached = driver
    return driver
  }

  /**
   * Invalidate the cached driver instance.
   * Must be called after the admin saves new storage settings.
   */
  static invalidate(): void {
    this._cached = null
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  private static async loadConfig(): Promise<Record<string, string>> {
    try {
      const rows = await prisma.option.findMany({
        where: { optionName: { in: STORAGE_OPTION_KEYS } },
      })
      return rows.reduce((acc, row) => {
        acc[row.optionName] = row.optionValue
        return acc
      }, {} as Record<string, string>)
    } catch {
      // DB not available during build or fresh install — fall back to local
      return {}
    }
  }

  private static buildS3Driver(config: Record<string, string>): S3Driver {
    const { s3_access_key, s3_secret_key, s3_bucket, s3_region, s3_endpoint, s3_public_url } = config

    if (!s3_access_key || !s3_secret_key || !s3_bucket || !s3_region) {
      console.warn('[Storage] S3 is selected but credentials are incomplete. Falling back to LocalDriver.')
      return new LocalDriver() as unknown as S3Driver
    }

    return new S3Driver({
      accessKeyId: s3_access_key,
      secretAccessKey: s3_secret_key,
      bucket: s3_bucket,
      region: s3_region,
      endpoint: s3_endpoint || undefined,
      publicUrl: s3_public_url || undefined,
    })
  }
}
