import prisma from "@/lib/prisma"

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
]

export class OptionService {
  /**
   * Retrieves specific global options from the database.
   * If an array of keys is provided, it fetches those.
   * Otherwise, it fetches the default allowed options.
   */
  static async getOptions(keys: string[] = ALLOWED_OPTIONS): Promise<Record<string, string>> {
    try {
      // Fast check: if no DATABASE_URL, don't even try to query
      if (!process.env.DATABASE_URL) {
        return {}
      }

      const options = await prisma.option.findMany({
        where: {
          optionName: { in: keys }
        }
      })

      const settingsMap = options.reduce((acc, opt) => {
        acc[opt.optionName] = opt.optionValue
        return acc
      }, {} as Record<string, string>)

      return settingsMap
    } catch (error) {
      // If database is not configured or tables don't exist yet, just return empty settings gracefully
      // This is essential for the /setup-config wizard to work because the Root Layout calls this.
      return {}
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
  }
}
