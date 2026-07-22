import { MetadataRoute } from 'next'
import { PostService } from '@/services/post.service'
import { OptionService } from '@/services/option.service'
import { generatePermalink } from '@/lib/permalinks'

// The database is a runtime-only dependency (see Dockerfile / DATABASE_URL
// docs) and may not be reachable during `next build` (e.g. building the
// Docker image with no DB container present). Without a revalidate window,
// a build-time failure here would statically bake in a broken/empty sitemap
// forever. Setting revalidate means production re-runs this once the DB is
// reachable, same pattern already used by src/app/(web)/[...slug]/page.tsx.
export const revalidate = 86400 // Revalidate daily by default

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = 'http://localhost:3000'

  try {
    const options = await OptionService.getOptions(['siteurl', 'permalink_structure'])
    const resolvedSiteUrl = options['siteurl'] || siteUrl
    const structure = options['permalink_structure'] || '/%postname%/'

    // Get all published posts and pages
    const posts = await PostService.getLatestPublished(1000, 'post')
    const pages = await PostService.getLatestPublished(1000, 'page')

    const allContent = [...posts, ...pages]

    const sitemapEntries: MetadataRoute.Sitemap = [
      {
        url: resolvedSiteUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      }
    ]

    allContent.forEach((post) => {
      const permalink = generatePermalink(post, structure)
      sitemapEntries.push({
        url: `${resolvedSiteUrl}${permalink}`,
        lastModified: post.postModified,
        changeFrequency: post.postType === 'page' ? 'weekly' : 'monthly',
        priority: post.postType === 'page' ? 0.8 : 0.6,
      })
    })

    return sitemapEntries
  } catch (err) {
    console.warn('[sitemap] database unavailable, returning minimal sitemap:', err)
    return [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      }
    ]
  }
}
