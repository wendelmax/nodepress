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
  const normalized = key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`)
  return /(^|_)(password|pass|secret|token|authorization|cookie|api_key|access_key|private_key|auth_token|client_secret)$/.test(normalized)
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

  if (Array.isArray(data.posts)) {
    result.posts = data.posts.map((post) => {
      if (!post || typeof post !== 'object') return post
      const { postPassword: _postPassword, ...safePost } = post as Record<string, unknown>
      return safePost
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

  for (const [key, value] of Object.entries(result)) {
    const safeValue = sanitizeNested(value)
    if (safeValue === undefined) delete result[key]
    else result[key] = safeValue
  }

  return result as T
}

function pickVersionedIdentity(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (typeof value.id === 'string') result.id = value.id
  if (typeof value.version === 'string') result.version = value.version
  return result
}

function sanitizeNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeNested).filter((item) => item !== undefined)
  if (value instanceof Date) return value.toISOString()
  if (!value || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  if (typeof record.metaKey === 'string' && looksSensitive(record.metaKey)) return undefined
  const safe: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(record)) {
    if (looksSensitive(key)) continue
    const safeItem = sanitizeNested(item)
    if (safeItem !== undefined) safe[key] = safeItem
  }
  return safe
}
