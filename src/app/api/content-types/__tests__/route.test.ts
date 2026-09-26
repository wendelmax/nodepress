import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const mocks = vi.hoisted(() => ({
  ensureActivePluginsLoaded: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/services/plugin-factory', () => ({
  ensureActivePluginsLoaded: mocks.ensureActivePluginsLoaded,
}))

vi.mock('@/modules/content', () => ({
  contentTypeRegistry: { list: mocks.list },
}))

describe('GET /api/content-types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureActivePluginsLoaded.mockResolvedValue(undefined)
    mocks.list.mockReturnValue([{ id: 'animal', label: 'Animais' }])
  })

  it('returns core and active plugin content types without duplicates', async () => {
    mocks.list.mockReturnValue([
      { id: 'animal', label: 'Animais' },
      { id: 'post', label: 'Custom Posts' },
    ])

    const response = await GET(new Request('http://localhost/api/content-types'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      types: [
        { id: 'animal', label: 'Animais' },
        { id: 'page', label: 'Pages' },
        { id: 'post', label: 'Posts' },
      ],
    })
    expect(mocks.ensureActivePluginsLoaded).toHaveBeenCalledOnce()
  })

  it('filters types by the optional search query', async () => {
    const response = await GET(new Request('http://localhost/api/content-types?search=ani'))

    await expect(response.json()).resolves.toEqual({
      types: [{ id: 'animal', label: 'Animais' }],
    })
  })
})
