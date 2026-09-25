import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPluginStorage } from '../storage'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    pluginStorage: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}))

describe('plugin storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads and writes values within the plugin namespace', async () => {
    const storage = createPluginStorage('reports')
    mocks.findUnique.mockResolvedValue({ value: { lastSync: '2026-09-25' } })

    await expect(storage.get<{ lastSync: string }>('configuration'))
      .resolves.toEqual({ lastSync: '2026-09-25' })
    await storage.set('configuration', { lastSync: '2026-09-26' })

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { pluginId_storageKey: { pluginId: 'reports', storageKey: 'configuration' } },
    })
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { pluginId_storageKey: { pluginId: 'reports', storageKey: 'configuration' } },
      update: { value: { lastSync: '2026-09-26' } },
      create: { pluginId: 'reports', storageKey: 'configuration', value: { lastSync: '2026-09-26' } },
    })
  })

  it('deletes a key idempotently inside the plugin namespace', async () => {
    const storage = createPluginStorage('reports')

    await storage.delete('configuration')

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { pluginId: 'reports', storageKey: 'configuration' },
    })
  })

  it('rejects invalid plugin ids and storage keys before touching the database', async () => {
    expect(() => createPluginStorage('')).toThrow('Plugin id is required')

    const storage = createPluginStorage('reports')
    await expect(storage.get('')).rejects.toThrow('Storage key is required')
    await expect(storage.set('bad key', true)).rejects.toThrow('Invalid storage key')
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
