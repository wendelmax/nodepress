import { describe, expect, it } from 'vitest'
import { createPluginSecrets, createPluginSettings } from '../config'
import type { PluginStorage } from '../storage'

function memoryStorage(): PluginStorage & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>()
  return {
    values,
    async get<T>(key: string) { return values.get(key) as T | undefined },
    async set(key: string, value: unknown) { values.set(key, value) },
    async delete(key: string) { values.delete(key) },
  }
}

describe('plugin settings', () => {
  it('validates typed values and persists them in a tenant-ready namespace', async () => {
    const storage = memoryStorage()
    const settings = createPluginSettings('reports', [
      { id: 'pageSize', label: 'Page size', type: 'number', defaultValue: 25 },
      { id: 'mode', label: 'Mode', type: 'select', options: ['safe', 'fast'], defaultValue: 'safe' },
    ], storage, { tenantId: 'tenant-a' })

    await expect(settings.get<number>('pageSize')).resolves.toBe(25)
    await settings.set('pageSize', 50)
    await settings.set('mode', 'fast')

    expect(storage.values.has('tenant.tenant-a.settings.pageSize')).toBe(true)
    await expect(settings.getAll()).resolves.toEqual({ pageSize: 50, mode: 'fast' })
    await expect(settings.set('pageSize', 'large')).rejects.toThrow('must be a number')
    await expect(settings.set('unknown', true)).rejects.toThrow('Unknown plugin setting')
  })

  it('redacts secret-marked settings from snapshots', async () => {
    const storage = memoryStorage()
    const settings = createPluginSettings('reports', [
      { id: 'apiKey', label: 'API key', type: 'text', secret: true },
    ], storage)

    await settings.set('apiKey', 'do-not-leak')
    await expect(settings.get('apiKey')).resolves.toBe('do-not-leak')
    await expect(settings.getAll()).resolves.toEqual({ apiKey: '[REDACTED]' })
    await expect(settings.getAll({ redactSecrets: false })).resolves.toEqual({ apiKey: 'do-not-leak' })
  })

  it('rejects invalid or duplicate definitions', () => {
    const storage = memoryStorage()
    expect(() => createPluginSettings('reports', [
      { id: 'mode', label: 'Mode', type: 'select' },
    ], storage)).toThrow('must define options')
    expect(() => createPluginSettings('reports', [
      { id: 'mode', label: 'Mode', type: 'text' },
      { id: 'mode', label: 'Mode again', type: 'text' },
    ], storage)).toThrow('Duplicate plugin setting')
  })
})

describe('plugin secrets', () => {
  it('encrypts values at rest and only exposes them through the secret API', async () => {
    const storage = memoryStorage()
    const secrets = createPluginSecrets('payments', [
      { id: 'stripe', label: 'Stripe secret key' },
    ], storage, 'test-encryption-key')

    await secrets.set('stripe', 'sk_test_private')
    const stored = storage.values.get('secrets.stripe')
    expect(stored).toMatchObject({ version: 1 })
    expect(JSON.stringify(stored)).not.toContain('sk_test_private')
    await expect(secrets.get('stripe')).resolves.toBe('sk_test_private')
    await expect(secrets.has('stripe')).resolves.toBe(true)
    await secrets.delete('stripe')
    await expect(secrets.has('stripe')).resolves.toBe(false)
  })

  it('requires a declared secret and an encryption key', async () => {
    const storage = memoryStorage()
    const secrets = createPluginSecrets('payments', [{ id: 'stripe', label: 'Stripe' }], storage, 'key')
    await expect(secrets.get('unknown')).rejects.toThrow('Unknown plugin secret')
    expect(() => createPluginSecrets('payments', [{ id: 'stripe', label: 'Stripe' }], storage, '')).toThrow(
      'Plugin secrets encryption key is required',
    )
  })
})
