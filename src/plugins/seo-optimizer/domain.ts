export type SeoContentType = 'post' | 'page' | 'organization' | string

export interface SeoContent {
  title: string
  excerpt?: string
  type?: SeoContentType
  image?: string
  publishedAt?: string | Date
  modifiedAt?: string | Date
}

export interface SeoOverrides {
  title?: string
  description?: string
  canonical?: string
  robots?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  schema?: Record<string, unknown>
}

export interface SeoMetadata {
  title: string
  description: string
  canonical: string
  robots?: string
  openGraph: {
    title: string
    description: string
    url: string
    type: 'article' | 'website'
    images?: string[]
  }
  twitter: {
    card: 'summary' | 'summary_large_image'
    title: string
    description: string
    creator?: string
    images?: string[]
  }
}

export interface SeoMetadataInput {
  siteName: string
  siteDescription?: string
  siteUrl: string
  path: string
  content?: SeoContent
  overrides?: SeoOverrides
  defaultImage?: string
  twitterHandle?: string
}

export interface SeoSitemapEntry {
  path: string
  type: string
  lastModified?: string | Date
}

export interface SeoSitemapResult {
  url: string
  lastModified?: string
  priority: number
  changeFrequency: 'daily' | 'weekly' | 'monthly'
}

export interface SeoRedirectRule {
  source: string
  target: string
  status: 301 | 302
}

function normalizeSiteUrl(siteUrl: string): string {
  const parsed = new URL(siteUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('SEO site URL must use http or https')
  return parsed.toString().replace(/\/$/, '')
}

function normalizePath(path: string): string {
  const normalized = path.trim()
  if (!normalized.startsWith('/') || normalized.startsWith('//')) throw new Error('SEO path must be a local path')
  return normalized === '/' ? '/' : `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

export function buildCanonicalUrl(siteUrl: string, path: string): string {
  return `${normalizeSiteUrl(siteUrl)}${normalizePath(path)}`
}

export function buildSeoMetadata(input: SeoMetadataInput): SeoMetadata {
  const content = input.content
  const overrides = input.overrides ?? {}
  const title = overrides.title?.trim() || content?.title?.trim() || input.siteName.trim()
  const description = overrides.description?.trim() || content?.excerpt?.trim() || input.siteDescription?.trim() || ''
  const canonical = overrides.canonical?.trim() || buildCanonicalUrl(input.siteUrl, input.path)
  const image = overrides.ogImage?.trim() || content?.image?.trim() || input.defaultImage?.trim()
  const type = content?.type === 'post' ? 'article' : 'website'
  return {
    title,
    description,
    canonical,
    ...(overrides.robots ? { robots: overrides.robots } : {}),
    openGraph: { title, description, url: canonical, type, ...(image ? { images: [image] } : {}) },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: overrides.twitterTitle?.trim() || title,
      description: overrides.twitterDescription?.trim() || description,
      ...(input.twitterHandle ? { creator: input.twitterHandle } : {}),
      ...(image ? { images: [image] } : {}),
    },
  }
}

export function buildJsonLd(input: SeoMetadataInput): Record<string, unknown> {
  const metadata = buildSeoMetadata(input)
  const type = input.content?.type === 'post' ? 'Article' : input.content?.type === 'organization' ? 'Organization' : 'WebPage'
  const base = {
    '@context': 'https://schema.org',
    '@type': type,
    name: input.siteName,
    headline: metadata.title,
    description: metadata.description,
    url: metadata.canonical,
    mainEntityOfPage: metadata.canonical,
    ...(input.content?.publishedAt ? { datePublished: new Date(input.content.publishedAt).toISOString() } : {}),
    ...(input.content?.modifiedAt ? { dateModified: new Date(input.content.modifiedAt).toISOString() } : {}),
    ...(input.content?.image ? { image: input.content.image } : {}),
  }
  return input.overrides?.schema
    ? { ...base, ...input.overrides.schema, '@context': 'https://schema.org', '@type': input.overrides.schema['@type'] ?? type }
    : base
}

export function buildBreadcrumbs(siteUrl: string, items: Array<{ label: string; path: string }>): Array<Record<string, unknown>> {
  return items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: buildCanonicalUrl(siteUrl, item.path),
  }))
}

export function buildSitemapEntries(siteUrl: string, entries: SeoSitemapEntry[]): SeoSitemapResult[] {
  const seen = new Set<string>()
  const result: SeoSitemapResult[] = [{ url: buildCanonicalUrl(siteUrl, '/'), priority: 1, changeFrequency: 'daily' }]
  for (const entry of entries) {
    const url = buildCanonicalUrl(siteUrl, entry.path)
    if (seen.has(url) || url === result[0].url) continue
    seen.add(url)
    result.push({
      url,
      ...(entry.lastModified ? { lastModified: new Date(entry.lastModified).toISOString() } : {}),
      priority: entry.type === 'page' ? 0.8 : 0.6,
      changeFrequency: entry.type === 'page' ? 'weekly' : 'monthly',
    })
  }
  return result
}

export function buildRobots(siteUrl: string, disallow: string[] = ['/admin/', '/api/'], allowIndexing = true) {
  return {
    rules: { userAgent: '*', allow: allowIndexing ? '/' : undefined, disallow },
    ...(allowIndexing ? { sitemap: `${normalizeSiteUrl(siteUrl)}/sitemap.xml` } : {}),
  }
}

export function validateRedirectRule(rule: SeoRedirectRule): void {
  if (!rule.source.startsWith('/') || rule.source.startsWith('//')) throw new Error('SEO redirect source must be a local path')
  if (!rule.target.startsWith('/') || rule.target.startsWith('//')) throw new Error('SEO redirect target must be a local path')
  if (normalizePath(rule.source) === normalizePath(rule.target)) throw new Error('SEO redirect cannot point to itself')
  if (rule.status !== 301 && rule.status !== 302) throw new Error('SEO redirect status must be 301 or 302')
}

export function resolveRedirect(path: string, rules: SeoRedirectRule[], maxHops = 10): { path: string; status: 301 | 302 } | undefined {
  let current = normalizePath(path)
  let status: 301 | 302 = 301
  const visited = new Set<string>()
  const bySource = new Map<string, SeoRedirectRule>()
  rules.forEach((rule) => { validateRedirectRule(rule); bySource.set(normalizePath(rule.source), rule) })
  for (let hop = 0; hop < maxHops; hop++) {
    const rule = bySource.get(current)
    if (!rule) return hop === 0 ? undefined : { path: current, status }
    if (visited.has(current)) throw new Error('SEO redirect loop detected')
    visited.add(current)
    current = normalizePath(rule.target)
    status = rule.status
  }
  throw new Error('SEO redirect chain exceeds the maximum hop count')
}
