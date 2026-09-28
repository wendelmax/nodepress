import { describe, expect, it } from 'vitest'
import {
  buildBreadcrumbs,
  buildJsonLd,
  buildRobots,
  buildSeoMetadata,
  buildSitemapEntries,
  resolveRedirect,
  validateRedirectRule,
} from '../domain'

describe('SEO domain', () => {
  const site = { siteName: 'NodePress', siteDescription: 'A CMS', siteUrl: 'https://example.test/' }

  it('builds metadata with content overrides and a safe canonical URL', () => {
    const metadata = buildSeoMetadata({
      ...site,
      path: '/articles/hello-world',
      content: {
        title: 'Hello world',
        excerpt: 'A useful excerpt',
        type: 'post',
        image: 'https://cdn.example.test/hello.jpg',
      },
      overrides: { title: 'Custom title', twitterTitle: 'Social title', robots: 'noindex,nofollow' },
      twitterHandle: '@nodepress',
    })

    expect(metadata).toMatchObject({
      title: 'Custom title',
      description: 'A useful excerpt',
      canonical: 'https://example.test/articles/hello-world',
      robots: 'noindex,nofollow',
      openGraph: { title: 'Custom title', type: 'article', images: ['https://cdn.example.test/hello.jpg'] },
      twitter: { card: 'summary_large_image', title: 'Social title', creator: '@nodepress' },
    })
  })

  it('creates JSON-LD and breadcrumbs without including sensitive content', () => {
    const jsonLd = buildJsonLd({
      siteName: 'NodePress', siteUrl: 'https://example.test', path: '/hello',
      content: { title: 'Hello', type: 'post', publishedAt: '2026-09-28T10:00:00.000Z' },
    })
    const breadcrumbs = buildBreadcrumbs('https://example.test', [
      { label: 'Home', path: '/' }, { label: 'News', path: '/category/news' }, { label: 'Hello', path: '/hello' },
    ])

    expect(jsonLd).toMatchObject({ '@type': 'Article', headline: 'Hello', mainEntityOfPage: 'https://example.test/hello' })
    expect(JSON.stringify(jsonLd)).not.toContain('postContent')
    expect(breadcrumbs).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.test/' },
      { '@type': 'ListItem', position: 2, name: 'News', item: 'https://example.test/category/news' },
      { '@type': 'ListItem', position: 3, name: 'Hello', item: 'https://example.test/hello' },
    ])
  })

  it('builds deterministic sitemap entries and configurable robots rules', () => {
    const entries = buildSitemapEntries('https://example.test', [
      { path: '/about', type: 'page', lastModified: '2026-09-27T00:00:00.000Z' },
      { path: '/hello', type: 'post', lastModified: '2026-09-28T00:00:00.000Z' },
      { path: '/about', type: 'page', lastModified: '2026-09-27T00:00:00.000Z' },
    ])
    const robots = buildRobots('https://example.test', ['/admin/', '/private/'], false)

    expect(entries).toEqual([
      { url: 'https://example.test/', priority: 1, changeFrequency: 'daily' },
      { url: 'https://example.test/about', lastModified: '2026-09-27T00:00:00.000Z', priority: 0.8, changeFrequency: 'weekly' },
      { url: 'https://example.test/hello', lastModified: '2026-09-28T00:00:00.000Z', priority: 0.6, changeFrequency: 'monthly' },
    ])
    expect(robots).toEqual({ rules: { userAgent: '*', allow: undefined, disallow: ['/admin/', '/private/'] } })
  })

  it('validates redirects and prevents loops and open redirects', () => {
    expect(() => validateRedirectRule({ source: '/old', target: 'https://evil.test', status: 301 })).toThrow('local path')
    expect(() => validateRedirectRule({ source: '/old', target: '/old', status: 301 })).toThrow('itself')
    expect(() => validateRedirectRule({ source: '/old', target: '/new', status: 307 as 301 })).toThrow('status')

    const rules = [
      { source: '/old', target: '/new', status: 301 as const },
      { source: '/new', target: '/current', status: 302 as const },
    ]
    expect(resolveRedirect('/old', rules)).toEqual({ path: '/current', status: 302 })
    expect(() => resolveRedirect('/a', [
      { source: '/a', target: '/b', status: 301 as const },
      { source: '/b', target: '/a', status: 301 as const },
    ])).toThrow('loop')
  })
})
