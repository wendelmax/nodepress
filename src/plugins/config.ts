import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { PluginStorage, PluginStorageValue } from './storage'

export type PluginSettingType = 'text' | 'number' | 'boolean' | 'select' | 'json'

export interface PluginSettingDefinition<T = unknown> {
  id: string
  label: string
  type: PluginSettingType
  defaultValue?: T
  options?: readonly string[]
  secret?: boolean
}

export interface PluginSecretDefinition {
  id: string
  label: string
}

export interface PluginSettings {
  get<T = unknown>(id: string): Promise<T | undefined>
  set<T = unknown>(id: string, value: T): Promise<void>
  getAll(options?: { redactSecrets?: boolean }): Promise<Record<string, unknown>>
  definitions(): readonly PluginSettingDefinition[]
}

export interface PluginSecrets {
  get(id: string): Promise<string | undefined>
  set(id: string, value: string): Promise<void>
  delete(id: string): Promise<void>
  has(id: string): Promise<boolean>
}

const SETTING_ID = /^[a-z][a-zA-Z0-9_-]*$/

function validateId(kind: string, id: string): void {
  if (!SETTING_ID.test(id)) throw new Error(`Invalid plugin ${kind} id: ${id}`)
}

function validateDefinitions<T extends { id: string; label: string }>(
  kind: string,
  definitions: readonly T[],
): Map<string, T> {
  const byId = new Map<string, T>()
  for (const definition of definitions) {
    validateId(kind, definition.id)
    if (!definition.label.trim()) throw new Error(`Plugin ${kind} label is required: ${definition.id}`)
    if (byId.has(definition.id)) throw new Error(`Duplicate plugin ${kind}: ${definition.id}`)
    byId.set(definition.id, definition)
  }
  return byId
}

function settingKey(tenantId: string, id: string): string {
  return tenantId === 'global' ? `settings.${id}` : `tenant.${tenantId}.settings.${id}`
}

function validateSettingDefinition(definition: PluginSettingDefinition): void {
  if (definition.type === 'select' && (!definition.options || definition.options.length === 0)) {
    throw new Error(`Plugin setting must define options: ${definition.id}`)
  }
  if (definition.type !== 'select' && definition.options?.length) {
    throw new Error(`Plugin setting options are only supported for select: ${definition.id}`)
  }
  if (definition.defaultValue !== undefined) validateSettingValue(definition, definition.defaultValue)
}

function validateSettingValue(definition: PluginSettingDefinition, value: unknown): void {
  const valid = definition.type === 'text' ? typeof value === 'string'
    : definition.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : definition.type === 'boolean' ? typeof value === 'boolean'
        : definition.type === 'json' ? value !== undefined
          : typeof value === 'string' && definition.options?.includes(value)
  if (!valid) {
    const expected = definition.type === 'select' ? `one of: ${definition.options?.join(', ')}` : `a ${definition.type}`
    throw new Error(`Plugin setting ${definition.id} must be ${expected}`)
  }
}

export function createPluginSettings(
  pluginId: string,
  definitions: readonly PluginSettingDefinition[],
  storage: PluginStorage,
  options: { tenantId?: string } = {},
): PluginSettings {
  const byId = validateDefinitions('setting', definitions)
  definitions.forEach(validateSettingDefinition)
  const tenantId = options.tenantId?.trim() || 'global'
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(tenantId) && tenantId !== 'global') throw new Error(`Invalid tenant id: ${tenantId}`)

  const definitionFor = (id: string): PluginSettingDefinition => {
    const definition = byId.get(id)
    if (!definition) throw new Error(`Unknown plugin setting: ${pluginId}.${id}`)
    return definition
  }
  return {
    async get<T>(id: string): Promise<T | undefined> {
      const definition = definitionFor(id)
      const stored = await storage.get<T>(settingKey(tenantId, id))
      return stored === undefined ? definition.defaultValue as T | undefined : stored
    },
    async set<T>(id: string, value: T): Promise<void> {
      const definition = definitionFor(id)
      validateSettingValue(definition, value)
      await storage.set(settingKey(tenantId, id), value as PluginStorageValue)
    },
    async getAll(options: { redactSecrets?: boolean } = {}): Promise<Record<string, unknown>> {
      const redactSecrets = options.redactSecrets ?? true
      const values: Record<string, unknown> = {}
      for (const definition of definitions) {
        const value = await this.get(definition.id)
        values[definition.id] = definition.secret && redactSecrets && value !== undefined ? '[REDACTED]' : value
      }
      return values
    },
    definitions: () => definitions,
  }
}

interface EncryptedSecret {
  version: 1
  iv: string
  tag: string
  ciphertext: string
}

function encryptionKey(key: string): Buffer {
  return createHash('sha256').update(key).digest()
}

function encrypt(value: string, key: Buffer): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}

function decrypt(value: EncryptedSecret, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8')
}

export function createPluginSecrets(
  pluginId: string,
  definitions: readonly PluginSecretDefinition[],
  storage: PluginStorage,
  secretKey: string,
): PluginSecrets {
  if (!secretKey.trim() && definitions.length > 0) throw new Error('Plugin secrets encryption key is required')
  const byId = validateDefinitions('secret', definitions)
  const key = encryptionKey(secretKey)
  const definitionFor = (id: string): PluginSecretDefinition => {
    if (!byId.has(id)) throw new Error(`Unknown plugin secret: ${pluginId}.${id}`)
    return byId.get(id)!
  }
  return {
    async get(id) {
      definitionFor(id)
      const stored = await storage.get<EncryptedSecret>(`secrets.${id}`)
      return stored ? decrypt(stored, key) : undefined
    },
    async set(id, value) {
      definitionFor(id)
      if (!value) throw new Error(`Plugin secret value is required: ${pluginId}.${id}`)
      await storage.set(`secrets.${id}`, encrypt(value, key) as unknown as PluginStorageValue)
    },
    async delete(id) {
      definitionFor(id)
      await storage.delete(`secrets.${id}`)
    },
    async has(id) {
      return (await this.get(id)) !== undefined
    },
  }
}
