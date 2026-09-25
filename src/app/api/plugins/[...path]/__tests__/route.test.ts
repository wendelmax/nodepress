import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const mocks = vi.hoisted(() => ({
  ensureActivePluginsLoaded: vi.fn(),
  dispatchPluginRoute: vi.fn(),
}))

vi.mock('@/services/plugin-factory', () => ({
  ensureActivePluginsLoaded: mocks.ensureActivePluginsLoaded,
}))

vi.mock('@/plugins/runtime-consumers', () => ({
  dispatchPluginRoute: mocks.dispatchPluginRoute,
}))

describe('GET /api/plugins/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureActivePluginsLoaded.mockResolvedValue(undefined)
  })

  it('loads active plugins and returns the dispatched response', async () => {
    mocks.dispatchPluginRoute.mockResolvedValue(Response.json({ plugin: true }))

    const response = await GET(new Request('http://localhost/api/plugins/health'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ plugin: true })
    expect(mocks.ensureActivePluginsLoaded).toHaveBeenCalledOnce()
    expect(mocks.dispatchPluginRoute).toHaveBeenCalledOnce()
  })

  it('returns a stable 404 when no plugin route matches', async () => {
    mocks.dispatchPluginRoute.mockResolvedValue(undefined)

    const response = await GET(new Request('http://localhost/api/plugins/missing'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      code: 'not_found',
      message: 'Plugin route not found',
    })
  })
})
