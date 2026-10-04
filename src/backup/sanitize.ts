const SENSITIVE_OPTION_KEYS = new Set([
  'ai_api_key',
  'auth_keycloak_secret',
  'cron_secret',
  's3_access_key',
  's3_secret_key',
  'secret_key',
  'smtp_password',
])

function looksSensitive(key: string): boolean {
  return /(^|_)(password|pass|secret|token|api_?key|private_?key|authorization|cookie)$/i.test(key)
}

export function sanitizeBackupData<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = { ...data }

  if (Array.isArray(data.users)) {
    result.users = data.users.map((user) => {
      if (!user || typeof user !== 'object') return user
      const { userPass: _userPass, userActivationKey: _activationKey, keycloakSub: _keycloakSub, ...safeUser } = user as Record<string, unknown>
      return safeUser
    })
  }

  if (Array.isArray(data.options)) {
    result.options = data.options.filter((option) => {
      const name = option && typeof option === 'object' ? String((option as Record<string, unknown>).optionName ?? '') : ''
      return name && !SENSITIVE_OPTION_KEYS.has(name.toLowerCase()) && !looksSensitive(name)
    })
  }

  delete result.pluginStorage

  if (data.extensions && typeof data.extensions === 'object') {
    const extensions = data.extensions as Record<string, unknown>
    const theme = extensions.theme && typeof extensions.theme === 'object'
      ? pickVersionedIdentity(extensions.theme as Record<string, unknown>)
      : extensions.theme
    const plugins = Array.isArray(extensions.plugins)
      ? extensions.plugins
        .filter((plugin): plugin is Record<string, unknown> => Boolean(plugin && typeof plugin === 'object'))
        .map(pickVersionedIdentity)
      : []
    result.extensions = { theme, plugins }
  }

  return result as T
}

function pickVersionedIdentity(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (typeof value.id === 'string') result.id = value.id
  if (typeof value.version === 'string') result.version = value.version
  return result
}
