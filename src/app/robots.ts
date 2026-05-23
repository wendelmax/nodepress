import { MetadataRoute } from 'next'
import { OptionService } from '@/services/option.service'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const options = await OptionService.getOptions(['siteurl'])
  const siteUrl = options['siteurl'] || 'http://localhost:3000'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
