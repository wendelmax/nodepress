import { MetadataRoute } from 'next'
import { SeoService } from '@/plugins/seo-optimizer/service'

// The database is a runtime-only dependency (see Dockerfile / DATABASE_URL
// docs) and may not be reachable during `next build` (e.g. building the
// Docker image with no DB container present). Without a revalidate window,
// a build-time failure here would statically bake in a broken/empty sitemap
// forever. Setting revalidate means production re-runs this once the DB is
// reachable, same pattern already used by src/app/(web)/[...slug]/page.tsx.
export const revalidate = 86400 // Revalidate daily by default

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await SeoService.getSitemap() as MetadataRoute.Sitemap
  } catch (err) {
    console.warn('[sitemap] SEO service unavailable, returning minimal sitemap:', err)
    return [
      {
        url: 'http://localhost:3000',
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      }
    ]
  }
}
