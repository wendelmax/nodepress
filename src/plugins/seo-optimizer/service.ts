import type { Metadata } from 'next'
import { OptionService } from '@/services/option.service'
import { PostService } from '@/services/post.service'
import { generatePermalink } from '@/lib/permalinks'
import {
  buildJsonLd,
  buildRobots,
  buildSeoMetadata,
  buildSitemapEntries,
  resolveRedirect,
  type SeoContent,
  type SeoMetadata,
  type SeoOverrides,
  type SeoRedirectRule,
} from './domain'

const SEO_META_KEYS = new Set([
  '_seo_title', '_seo_description', '_seo_canonical', '_seo_robots',
  '_seo_og_image', '_seo_twitter_title', '_seo_twitter_description', '_seo_schema',
])

export interface SeoPostLike {
  postTitle: string
  postExcerpt?: string
  postType: string
  postName: string
  postDate: Date
  postModified?: Date
  postContent?: string
  meta?: Array<{ metaKey: string | null; metaValue: string | null }>
}

export interface SeoSiteConfig {
  siteName: string
  siteDescription: string
  siteUrl: string
  defaultImage?: string
  twitterHandle?: string
  sitemapEnabled: boolean
  robotsDisallow: string[]
}

export class SeoService {
  static async getSiteConfig(): Promise<SeoSiteConfig> {
    const options = await OptionService.getOptions([
      'blogname', 'blogdescription', 'siteurl', 'seo_site_title', 'seo_meta_description',
      'seo_og_image', 'seo_twitter_handle', 'seo_sitemap_enabled', 'seo_robots_disallow',
    ])
    return {
      siteName: options.seo_site_title || options.blogname || 'NodePress',
      siteDescription: options.seo_meta_description || options.blogdescription || '',
      siteUrl: options.siteurl || 'http://localhost:3000',
      defaultImage: options.seo_og_image || undefined,
      twitterHandle: options.seo_twitter_handle || undefined,
      sitemapEnabled: options.seo_sitemap_enabled !== 'false',
      robotsDisallow: parseDisallow(options.seo_robots_disallow),
    }
  }

  static async metadataForPost(post: SeoPostLike, path: string): Promise<SeoMetadata> {
    const site = await this.getSiteConfig()
    return buildSeoMetadata({ ...site, path, content: toSeoContent(post), overrides: readOverrides(post.meta) })
  }

  static async metadataForSite(path = '/', content?: SeoContent): Promise<SeoMetadata> {
    const site = await this.getSiteConfig()
    return buildSeoMetadata({ ...site, path, content })
  }

  static async jsonLdForPost(post: SeoPostLike, path: string): Promise<Record<string, unknown>> {
    const site = await this.getSiteConfig()
    return buildJsonLd({ ...site, path, content: toSeoContent(post), overrides: readOverrides(post.meta) })
  }

  static async metadataForLandingPage(page: { title: string; data: Record<string, unknown> }, path: string): Promise<SeoMetadata> {
    const site = await this.getSiteConfig()
    const seo = page.data.seo && typeof page.data.seo === 'object' && !Array.isArray(page.data.seo)
      ? page.data.seo as Record<string, unknown>
      : {}
    return buildSeoMetadata({
      ...site,
      path,
      content: { title: page.title, excerpt: asString(seo.description), type: 'page' },
      overrides: {
        title: asString(seo.title), description: asString(seo.description), canonical: asString(seo.canonical),
        ogImage: asString(seo.ogImage), robots: asString(seo.robots),
      },
    })
  }

  static toNextMetadata(metadata: SeoMetadata): Metadata {
    return {
      title: metadata.title,
      description: metadata.description || undefined,
      alternates: { canonical: metadata.canonical },
      ...(metadata.robots ? { robots: metadata.robots } : {}),
      openGraph: {
        title: metadata.openGraph.title,
        description: metadata.openGraph.description,
        url: metadata.openGraph.url,
        type: metadata.openGraph.type,
        ...(metadata.openGraph.images ? { images: metadata.openGraph.images } : {}),
      },
      twitter: {
        card: metadata.twitter.card,
        title: metadata.twitter.title,
        description: metadata.twitter.description,
        ...(metadata.twitter.creator ? { creator: metadata.twitter.creator } : {}),
        ...(metadata.twitter.images ? { images: metadata.twitter.images } : {}),
      },
    }
  }

  static async getSitemap(): Promise<ReturnType<typeof buildSitemapEntries>> {
    const site = await this.getSiteConfig()
    if (!site.sitemapEnabled) return []
    const options = await OptionService.getOptions(['permalink_structure'])
    const structure = options.permalink_structure || '/%postname%/'
    const [posts, pages] = await Promise.all([
      PostService.getLatestPublished(1000, 'post'),
      PostService.getLatestPublished(1000, 'page'),
    ])
    return buildSitemapEntries(site.siteUrl, [...posts, ...pages].map((post) => ({
      path: generatePermalink(post, structure), type: post.postType, lastModified: post.postModified,
    })))
  }

  static async getRobots() {
    const site = await this.getSiteConfig()
    return buildRobots(site.siteUrl, site.robotsDisallow, site.sitemapEnabled)
  }

  static async getRedirect(path: string): Promise<{ path: string; status: 301 | 302 } | undefined> {
    const options = await OptionService.getOptions(['seo_redirects'])
    if (!options.seo_redirects) return undefined
    try {
      const parsed = JSON.parse(options.seo_redirects) as unknown
      return Array.isArray(parsed) ? resolveRedirect(path, parsed.filter(isRedirectRule)) : undefined
    } catch {
      return undefined
    }
  }
}

export function readOverrides(meta?: SeoPostLike['meta']): SeoOverrides {
  const values = Object.fromEntries((meta ?? [])
    .filter((item) => item.metaKey && SEO_META_KEYS.has(item.metaKey))
    .map((item) => [item.metaKey, item.metaValue ?? '']))
  let schema: Record<string, unknown> | undefined
  if (values._seo_schema) {
    try {
      const parsed = JSON.parse(values._seo_schema)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) schema = parsed
    } catch { schema = undefined }
  }
  return {
    title: values._seo_title, description: values._seo_description, canonical: values._seo_canonical,
    robots: values._seo_robots, ogImage: values._seo_og_image,
    twitterTitle: values._seo_twitter_title, twitterDescription: values._seo_twitter_description, schema,
  }
}

function toSeoContent(post: SeoPostLike): SeoContent {
  return {
    title: post.postTitle, excerpt: post.postExcerpt, type: post.postType,
    image: post.meta?.find((item) => item.metaKey === '_thumbnail_url')?.metaValue ?? undefined,
    publishedAt: post.postDate, modifiedAt: post.postModified,
  }
}

function parseDisallow(value?: string): string[] {
  if (!value) return ['/admin/', '/api/']
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.startsWith('/'))
  } catch { /* Support comma/newline configuration. */ }
  return value.split(/[\n,]/).map((item) => item.trim()).filter((item) => item.startsWith('/'))
}

function isRedirectRule(value: unknown): value is SeoRedirectRule {
  if (!value || typeof value !== 'object') return false
  const rule = value as Record<string, unknown>
  return typeof rule.source === 'string' && typeof rule.target === 'string' && (rule.status === 301 || rule.status === 302)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}
