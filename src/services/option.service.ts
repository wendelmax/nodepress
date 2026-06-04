import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const ALLOWED_OPTIONS = [
  'blogname',
  'blogdescription',
  'siteurl',
  'admin_email',
  'site_language',
  'permalink_structure',
  'show_on_front',
  'page_on_front',
  'page_for_posts',
  'acf_field_groups',
  'seo_site_title',
  'seo_meta_description',
  'seo_og_image',
  'seo_twitter_handle',
  'analytics_ga4_id',
  'active_theme',
  'active_plugins',
  'cron_secret',
  'ai_provider',
  'ai_api_key',
  'ai_model',
  'ai_base_url',
  'site_analytics',
  'site_footer_content',
  // Storage driver configuration
  'storage_driver',
  's3_access_key',
  's3_secret_key',
  's3_bucket',
  's3_region',
  's3_endpoint',
  's3_public_url',
  'optimize_webp',
]

export class OptionService {
  private static cache = new Map<string, { value: string; expiresAt: number }>()
  private static CACHE_TTL_MS = 30_000

  /**
   * Retrieves specific global options from the database.
   * If an array of keys is provided, it fetches those.
   * Otherwise, it fetches the default allowed options.
   */
  static async getOptions(keys: string[] = ALLOWED_OPTIONS): Promise<Record<string, string>> {
    const now = Date.now()
    const settingsMap: Record<string, string> = {}
    const missingKeys: string[] = []

    for (const key of keys) {
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > now) {
        settingsMap[key] = cached.value
      } else {
        missingKeys.push(key)
      }
    }

    if (missingKeys.length === 0) {
      return settingsMap
    }

    try {
      // Fast check: if no DATABASE_URL, don't even try to query
      if (!process.env.DATABASE_URL) {
        return settingsMap
      }

      const options = await prisma.option.findMany({
        where: {
          optionName: { in: missingKeys }
        }
      })

      for (const opt of options) {
        settingsMap[opt.optionName] = opt.optionValue
        this.cache.set(opt.optionName, {
          value: opt.optionValue,
          expiresAt: now + this.CACHE_TTL_MS
        })
      }

      return settingsMap
    } catch (error) {
      // If database is not configured or tables don't exist yet, just return empty settings gracefully
      // This is essential for the /setup-config wizard to work because the Root Layout calls this.
      return settingsMap
    }
  }

  /**
   * Updates or creates options in the database.
   * Only allows updating options defined in ALLOWED_OPTIONS.
   */
  static async saveOptions(payload: Record<string, string>): Promise<void> {
    const promises = []

    for (const key of ALLOWED_OPTIONS) {
      if (payload[key] !== undefined) {
        promises.push(
          prisma.option.upsert({
            where: { optionName: key },
            update: { optionValue: payload[key] },
            create: { optionName: key, optionValue: payload[key] }
          })
        )
      }
    }

    await Promise.all(promises)

    const now = Date.now()
    for (const [key, value] of Object.entries(payload)) {
      if (ALLOWED_OPTIONS.includes(key)) {
        this.cache.set(key, {
          value,
          expiresAt: now + this.CACHE_TTL_MS
        })
      }
    }

    // Invalidate the cache for the entire site since options affect global layouts, seo, and themes
    try { revalidatePath('/', 'layout') } catch (e) {}
  }
}
