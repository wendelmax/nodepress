import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const mocks = vi.hoisted(() => ({
  getPublishedPostShowcase: vi.fn(),
  normalizePostShowcaseQuery: vi.fn((input) => input),
}))

vi.mock('@/services/post-showcase.service', () => ({
  getPublishedPostShowcase: mocks.getPublishedPostShowcase,
  normalizePostShowcaseQuery: mocks.normalizePostShowcaseQuery,
}))

describe('GET /api/posts/showcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the public showcase DTO for valid query params', async () => {
    mocks.getPublishedPostShowcase.mockResolvedValue([{
      id: 1,
      title: 'Luna',
      slug: 'luna',
      excerpt: '',
      date: '2026-09-25T00:00:00.000Z',
    }])

    const response = await GET(new Request(
      'http://localhost/api/posts/showcase?type=post&limit=6&category=adocao',
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([expect.objectContaining({ id: 1, slug: 'luna' })])
    expect(mocks.getPublishedPostShowcase).toHaveBeenCalledWith({
      postType: 'post',
      limit: 6,
      category: 'adocao',
    })
  })

  it('rejects malformed limits before querying the database', async () => {
    const response = await GET(new Request(
      'http://localhost/api/posts/showcase?type=post&limit=abc',
    ))

    expect(response.status).toBe(400)
    expect(mocks.getPublishedPostShowcase).not.toHaveBeenCalled()
  })

  it('maps known invalid types to a bad request', async () => {
    mocks.getPublishedPostShowcase.mockRejectedValue(new Error('Invalid post type: inactive'))

    const response = await GET(new Request(
      'http://localhost/api/posts/showcase?type=inactive&limit=6',
    ))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid_request' })
  })
})
