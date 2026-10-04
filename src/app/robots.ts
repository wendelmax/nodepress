import { MetadataRoute } from 'next'
import { SeoService } from '@/plugins/seo-optimizer/service'

export default async function robots(): Promise<MetadataRoute.Robots> {
  return SeoService.getRobots()
}
