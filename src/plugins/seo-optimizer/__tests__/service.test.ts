import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SeoService, readOverrides } from '../service'

const mocks = vi.hoisted(() => ({ getOptions: vi.fn(), getLatestPublished: vi.fn() }))

vi.mock('@/services/option.service', () => ({ OptionService: { getOptions: mocks.getOptions } }))
vi.mock('@/services/post.service', () => ({ PostService: { getLatestPublished: mocks.getLatestPublished } }))

describe('SEO service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOptions.mockResolvedValue({
      blogname: 'NodePress', blogdescription: 'CMS', siteurl: 'https://example.test',
      seo_sitemap_enabled: 'true', permalink_structure: '/%postname%/',
    })
  })

  it('reads post SEO fields without changing the source content', async () => {
    const post = {
      postTitle: 'Hello', postExcerpt: 'Excerpt', postType: 'post', postName: 'hello',
      postDate: new Date('2026-09-28T00:00:00.000Z'), postContent: '<p>Original</p>',
      meta: [
        { metaKey: '_seo_title', metaValue: 'Custom' },
        { metaKey: '_thumbnail_url', metaValue: 'https://cdn.test/hello.jpg' },
      ],
    }
    const metadata = await SeoService.metadataForPost(post, '/hello')

    expect(metadata.title).toBe('Custom')
    expect(metadata.canonical).toBe('https://example.test/hello')
    expect(post.postContent).toBe('<p>Original</p>')
    expect(readOverrides([{ metaKey: '_seo_schema', metaValue: '{"@type":"Article"}' }]).schema).toEqual({ '@type': 'Article' })
  })

  it('builds the sitemap from published posts and pages', async () => {
    mocks.getLatestPublished
      .mockResolvedValueOnce([{ postName: 'hello', postType: 'post', postModified: new Date('2026-09-28T00:00:00.000Z'), postDate: new Date('2026-09-27T00:00:00.000Z') }])
      .mockResolvedValueOnce([{ postName: 'about', postType: 'page', postModified: new Date('2026-09-27T00:00:00.000Z'), postDate: new Date('2026-09-26T00:00:00.000Z') }])

    await expect(SeoService.getSitemap()).resolves.toEqual([
      expect.objectContaining({ url: 'https://example.test/', priority: 1 }),
      expect.objectContaining({ url: 'https://example.test/hello', priority: 0.6 }),
      expect.objectContaining({ url: 'https://example.test/about', priority: 0.8 }),
    ])
  })
})
