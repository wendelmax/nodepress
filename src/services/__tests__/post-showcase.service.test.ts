import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPublishedPostShowcase,
  normalizePostShowcaseQuery,
} from '../post-showcase.service'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getPostIdsByTermSlug: vi.fn(),
  ensureActivePluginsLoaded: vi.fn(),
  contentTypeList: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: { post: { findMany: mocks.findMany } },
}))

vi.mock('@/services/taxonomy.service', () => ({
  TaxonomyService: { getPostIdsByTermSlug: mocks.getPostIdsByTermSlug },
}))

vi.mock('@/services/plugin-factory', () => ({
  ensureActivePluginsLoaded: mocks.ensureActivePluginsLoaded,
}))

vi.mock('@/modules/content', () => ({
  contentTypeRegistry: { list: mocks.contentTypeList },
}))

describe('published post showcase service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.contentTypeList.mockReturnValue([{ id: 'animal', label: 'Animais' }])
    mocks.ensureActivePluginsLoaded.mockResolvedValue(undefined)
    mocks.getPostIdsByTermSlug.mockResolvedValue([4, 8])
    mocks.findMany.mockResolvedValue([])
  })

  it('returns only published items projected to the public DTO', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 4,
        postTitle: 'Luna',
        postName: 'luna',
        postExcerpt: 'Disponível para adoção',
        postDate: new Date('2026-09-25T12:00:00.000Z'),
        meta: [{ metaValue: '/media/luna.jpg' }],
      },
    ])

    await expect(getPublishedPostShowcase({ postType: 'animal', limit: 6 }))
      .resolves.toEqual([{
        id: 4,
        title: 'Luna',
        slug: 'luna',
        excerpt: 'Disponível para adoção',
        date: '2026-09-25T12:00:00.000Z',
        thumbnailUrl: '/media/luna.jpg',
      }])

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { postStatus: 'publish', postType: 'animal' },
      take: 6,
    }))
    const query = mocks.findMany.mock.calls[0]?.[0]
    expect(query.select).not.toHaveProperty('postContent')
    expect(query.select).not.toHaveProperty('author')
  })

  it('filters by category IDs and returns empty when the category has no posts', async () => {
    await getPublishedPostShowcase({ postType: 'post', limit: 3, category: 'adocao' })
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: [4, 8] } }),
    }))
    expect(mocks.getPostIdsByTermSlug).toHaveBeenCalledWith('adocao', 'category')

    mocks.getPostIdsByTermSlug.mockResolvedValue([])
    mocks.findMany.mockClear()
    await expect(getPublishedPostShowcase({ postType: 'post', limit: 3, category: 'vazio' }))
      .resolves.toEqual([])
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('rejects inactive types and normalizes limits deterministically', async () => {
    await expect(getPublishedPostShowcase({ postType: 'inactive', limit: 99 }))
      .rejects.toThrow('Invalid post type')
    expect(normalizePostShowcaseQuery({ postType: 'post', limit: 0 }))
      .toEqual({ postType: 'post', limit: 1 })
    expect(normalizePostShowcaseQuery({ postType: 'post', limit: 99.8 }))
      .toEqual({ postType: 'post', limit: 12 })
    expect(normalizePostShowcaseQuery({ postType: 'post', limit: 'not-a-number' }))
      .toEqual({ postType: 'post', limit: 6 })
  })
})
