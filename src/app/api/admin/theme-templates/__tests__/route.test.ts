import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'
import { POST as preview } from '../preview/route'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getServerPuckConfig: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/puck/server-config', () => ({ getServerPuckConfig: mocks.getServerPuckConfig }))
vi.mock('@/services/theme-template.service', () => ({ themeTemplateService: { create: mocks.create } }))

const payload = {
  id: 'single-post', themeSlug: 'default', area: 'single', name: 'Single Post',
  conditions: { postType: 'post' }, priority: 10, enabled: false,
  document: {
    version: 1, content: [{ type: 'Heading', props: { title: 'Hello', level: 'h1', align: 'left' } }],
    root: {}, metadata: { editor: 'puck', schemaVersion: 1 },
  },
}

describe('admin theme template API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { role: 'admin' } })
    mocks.getServerPuckConfig.mockResolvedValue({ components: { Heading: {}, ThemeSlot: {} } })
    mocks.create.mockResolvedValue({ id: 'template-1' })
  })

  it('returns a preview without persisting it', async () => {
    const response = await preview(new Request('http://localhost/api/admin/theme-templates/preview', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(200)
    expect(mocks.create).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ valid: true })
  })

  it('rejects invalid components before create', async () => {
    const response = await POST(new Request('http://localhost/api/admin/theme-templates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, document: { ...payload.document, content: [{ type: 'Unknown', props: {} }] } }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a validated disabled template', async () => {
    const response = await POST(new Request('http://localhost/api/admin/theme-templates', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledOnce()
  })
})
