import { describe, expect, it } from 'vitest'
import { sanitizeBackupData } from '@/backup/sanitize'

describe('backup sanitization', () => {
  it('removes credentials and secret options while preserving public data', () => {
    const result = sanitizeBackupData({
      users: [{ id: 7, userLogin: 'admin', userPass: 'hash', userActivationKey: 'token', displayName: 'Admin' }],
      options: [
        { optionName: 'blogname', optionValue: 'NodePress' },
        { optionName: 's3_secret_key', optionValue: 'secret' },
        { optionName: 'ai_api_key', optionValue: 'key' },
      ],
    })

    expect(result.users).toEqual([{ id: 7, userLogin: 'admin', displayName: 'Admin' }])
    expect(result.options).toEqual([{ optionName: 'blogname', optionValue: 'NodePress' }])
  })

  it('does not expose plugin storage or secret-looking extension fields', () => {
    const result = sanitizeBackupData({
      pluginStorage: [{ pluginId: 'demo', storageKey: 'secret', value: 'hidden' }],
      extensions: { theme: { id: 'default' }, plugins: [{ id: 'demo', version: '1.0.0', secret: 'hidden' }] },
    })

    expect(result).not.toHaveProperty('pluginStorage')
    expect(result.extensions).toEqual({ theme: { id: 'default' }, plugins: [{ id: 'demo', version: '1.0.0' }] })
  })
})
