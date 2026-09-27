import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  getServerPuckConfig: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/services/pattern.service', () => ({ patternService: { list: mocks.list, create: mocks.create } }))
vi.mock('@/lib/puck/server-config', () => ({ getServerPuckConfig: mocks.getServerPuckConfig }))

const validPackage = {
  manifest: {
    format: 'nodepress-pattern', formatVersion: 1, id: 'hero-home', name: 'Hero Home',
    description: 'Reusable hero', kind: 'section', category: 'Landing pages', tags: ['hero'],
    engine: '>=1.0.0', schemaVersion: 1, version: 1,
  },
  document: {
    version: 1,
    content: [{ type: 'Heading', props: { title: 'Hello', level: 'h1', align: 'left' } }],
    root: {},
    metadata: { editor: 'puck', schemaVersion: 1 },
  },
}

describe('admin pattern catalog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { role: 'admin' } })
    mocks.getServerPuckConfig.mockResolvedValue({ components: { Heading: {} } })
    mocks.list.mockResolvedValue([])
    mocks.create.mockResolvedValue({ id: 'pattern-1' })
  })

  it('rejects non-admin catalog access', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/admin/patterns'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('passes search filters to the catalog service', async () => {
    const response = await GET(new Request('http://localhost/api/admin/patterns?search=hero&category=Landing%20pages&tag=hero'))

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith({ search: 'hero', category: 'Landing pages', tag: 'hero', includeArchived: false })
  })

  it('validates components before creating a pattern', async () => {
    const response = await POST(new Request('http://localhost/api/admin/patterns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...validPackage, document: { ...validPackage.document, content: [{ type: 'Unknown', props: {} }] } }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a validated pattern', async () => {
    const response = await POST(new Request('http://localhost/api/admin/patterns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPackage),
    }))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledOnce()
  })
})
