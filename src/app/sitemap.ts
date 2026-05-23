import { MetadataRoute } from 'next'
import { PostService } from '@/services/post.service'
import { OptionService } from '@/services/option.service'
import { generatePermalink } from '@/lib/permalinks'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const options = await OptionService.getOptions(['siteurl', 'permalink_structure'])
  const siteUrl = options['siteurl'] || 'http://localhost:3000'
  const structure = options['permalink_structure'] || '/%postname%/'

  // Get all published posts and pages
  const posts = await PostService.getLatestPublished(1000, 'post')
  const pages = await PostService.getLatestPublished(1000, 'page')
  
  const allContent = [...posts, ...pages]

  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }
  ]

  allContent.forEach((post) => {
    const permalink = generatePermalink(post, structure)
    sitemapEntries.push({
      url: `${siteUrl}${permalink}`,
      lastModified: post.postModified,
      changeFrequency: post.postType === 'page' ? 'weekly' : 'monthly',
      priority: post.postType === 'page' ? 0.8 : 0.6,
    })
  })

  return sitemapEntries
}
