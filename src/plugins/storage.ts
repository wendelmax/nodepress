import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export type PluginStorageValue = Prisma.InputJsonValue

export interface PluginStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  set(key: string, value: PluginStorageValue): Promise<void>
  delete(key: string): Promise<void>
}

const STORAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

function validatePluginId(pluginId: string): void {
  if (!pluginId.trim()) throw new Error('Plugin id is required')
}

function normalizeStorageKey(key: string): string {
  const normalized = key.trim()
  if (!normalized) throw new Error('Storage key is required')
  if (!STORAGE_KEY_PATTERN.test(normalized)) throw new Error(`Invalid storage key: ${key}`)
  return normalized
}

export function createPluginStorage(pluginId: string): PluginStorage {
  validatePluginId(pluginId)

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const storageKey = normalizeStorageKey(key)
      const record = await prisma.pluginStorage.findUnique({
        where: { pluginId_storageKey: { pluginId, storageKey } },
      })
      return record?.value as T | undefined
    },
    async set(key: string, value: PluginStorageValue): Promise<void> {
      const storageKey = normalizeStorageKey(key)
      await prisma.pluginStorage.upsert({
        where: { pluginId_storageKey: { pluginId, storageKey } },
        update: { value },
        create: { pluginId, storageKey, value },
      })
    },
    async delete(key: string): Promise<void> {
      const storageKey = normalizeStorageKey(key)
      await prisma.pluginStorage.deleteMany({ where: { pluginId, storageKey } })
    },
  }
}
