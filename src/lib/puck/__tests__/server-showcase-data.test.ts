import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePostShowcaseData } from '../server-showcase-data'

const mocks = vi.hoisted(() => ({
  getPublishedPostShowcase: vi.fn(),
  normalizePostShowcaseQuery: vi.fn((input) => input),
}))

vi.mock('@/services/post-showcase.service', () => ({
  getPublishedPostShowcase: mocks.getPublishedPostShowcase,
  normalizePostShowcaseQuery: mocks.normalizePostShowcaseQuery,
}))

describe('resolvePostShowcaseData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.normalizePostShowcaseQuery.mockImplementation((input) => input)
  })

  it('enriches repeated showcase queries once without mutating the input', async () => {
    mocks.getPublishedPostShowcase.mockResolvedValue([{
      id: 1,
      title: 'Luna',
      slug: 'luna',
      excerpt: '',
      date: '2026-09-25T00:00:00.000Z',
    }])
    const data = {
      root: {},
      content: [
        { type: 'PostShowcase', props: { postType: 'post', limit: 6, category: '' } },
        { type: 'PostShowcase', props: { postType: 'post', limit: 6, category: '' } },
      ],
    }

    const resolved = await resolvePostShowcaseData(data)

    expect(resolved).not.toBe(data)
    expect(resolved.content[0].props.items).toHaveLength(1)
    expect(resolved.content[1].props.items).toHaveLength(1)
    expect(mocks.getPublishedPostShowcase).toHaveBeenCalledOnce()
    expect(data.content[0].props).not.toHaveProperty('items')
  })

  it('returns an empty state for invalid showcase configuration', async () => {
    mocks.normalizePostShowcaseQuery.mockImplementationOnce(() => {
      throw new Error('Invalid post type')
    })

    const resolved = await resolvePostShowcaseData({
      root: {},
      content: [{ type: 'PostShowcase', props: { postType: '', limit: 6 } }],
    })

    expect(resolved.content[0].props.items).toEqual([])
    expect(mocks.getPublishedPostShowcase).not.toHaveBeenCalled()
  })

  it('does not touch non-showcase nodes', async () => {
    const heading = { type: 'Heading', props: { title: 'Legacy' } }
    const data = { root: {}, content: [heading] }

    const resolved = await resolvePostShowcaseData(data)

    expect(resolved.content[0]).toBe(heading)
    expect(mocks.getPublishedPostShowcase).not.toHaveBeenCalled()
  })
})
