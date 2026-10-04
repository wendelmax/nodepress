export const BUILDER_SCRIPTS_CAPABILITY = 'builder.scripts'

export interface BuilderSecurityPolicy {
  allowScripts: boolean
}

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
const URL_BASE = 'https://nodepress.invalid'

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'cite', 'code', 'del', 'div', 'em',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'img', 'ins',
  'li', 'mark', 'ol', 'p', 'pre', 'q', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'th', 'thead', 'time', 'tr', 'u', 'ul',
])

const DANGEROUS_TAGS = new Set([
  'base', 'embed', 'form', 'iframe', 'link', 'math', 'meta', 'object', 'script',
  'style', 'svg', 'template', 'video', 'audio',
])

const GLOBAL_ATTRIBUTES = new Set(['class', 'dir', 'id', 'lang', 'role', 'title'])
const TAG_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'rel', 'target']),
  blockquote: new Set(['cite']),
  img: new Set(['alt', 'decoding', 'height', 'loading', 'src', 'width']),
  ol: new Set(['start', 'reversed', 'type']),
  time: new Set(['datetime']),
  th: new Set(['colspan', 'rowspan', 'scope']),
}

function decodeUrlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);?/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
}

function normalizedUrl(value: string): string {
  return decodeUrlEntities(value)
    .replace(/[\u0000-\u0020\u007f-\u00a0]+/g, '')
    .toLowerCase()
}

function isRelativeUrl(value: string): boolean {
  return value.startsWith('/') || value.startsWith('./') || value.startsWith('../')
    || value.startsWith('#') || value.startsWith('?')
}

export function sanitizeUrl(
  value: unknown,
  context: 'href' | 'src' = 'href',
): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed || /[\\\u0000-\u001f\u007f]/.test(trimmed)) return undefined

  const normalized = normalizedUrl(trimmed)
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return undefined

  if (isRelativeUrl(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return trimmed

  let parsed: URL
  try {
    parsed = new URL(trimmed, URL_BASE)
  } catch {
    return undefined
  }

  const protocols = context === 'src' ? SAFE_IMAGE_PROTOCOLS : SAFE_URL_PROTOCOLS
  return protocols.has(parsed.protocol) ? trimmed : undefined
}

export function createBuilderSecurityPolicy(
  capabilities: Iterable<string> = [],
): BuilderSecurityPolicy {
  return { allowScripts: new Set(capabilities).has(BUILDER_SCRIPTS_CAPABILITY) }
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isAllowedAttribute(tag: string, name: string): boolean {
  const lowerName = name.toLowerCase()
  return !lowerName.startsWith('on')
    && lowerName !== 'style'
    && lowerName !== 'srcset'
    && (GLOBAL_ATTRIBUTES.has(lowerName)
      || lowerName.startsWith('aria-')
      || lowerName.startsWith('data-')
      || TAG_ATTRIBUTES[tag]?.has(lowerName) === true)
}

function sanitizeAttributes(tag: string, source: string): string {
  const attributes: string[] = []
  const attributePattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(source)) !== null) {
    const name = match[1].toLowerCase()
    if (!isAllowedAttribute(tag, name)) continue

    const rawValue = match[2] ?? match[3] ?? match[4] ?? ''
    if (name === 'href' || name === 'cite') {
      const safeValue = sanitizeUrl(rawValue)
      if (safeValue) attributes.push(`${name}="${escapeAttribute(safeValue)}"`)
      continue
    }
    if (name === 'src') {
      const safeValue = sanitizeUrl(rawValue, 'src')
      if (safeValue) attributes.push(`src="${escapeAttribute(safeValue)}"`)
      continue
    }
    if (name === 'target') {
      if (rawValue === '_blank') attributes.push('target="_blank"')
      continue
    }
    if (name === 'loading' || name === 'decoding') continue

    attributes.push(`${name}="${escapeAttribute(rawValue)}"`)
  }

  if (tag === 'img') {
    if (!attributes.some((attribute) => attribute.startsWith('src='))) return ''
    attributes.push('loading="lazy"', 'decoding="async"')
  }
  if (tag === 'a' && attributes.some((attribute) => attribute === 'target="_blank"')
    && !attributes.some((attribute) => attribute.startsWith('rel='))) {
    attributes.push('rel="noopener noreferrer"')
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

export function sanitizeHtml(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return ''

  const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g
  const parts: string[] = []
  let cursor = 0
  let skippedTag: string | undefined
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(value)) !== null) {
    if (!skippedTag) parts.push(value.slice(cursor, match.index))
    const token = match[0]
    const closingMatch = token.match(/^<\/\s*([A-Za-z][\w-]*)/)
    const openingMatch = token.match(/^<\s*([A-Za-z][\w-]*)/)
    const tag = (closingMatch?.[1] ?? openingMatch?.[1] ?? '').toLowerCase()

    if (skippedTag) {
      if (closingMatch && tag === skippedTag) skippedTag = undefined
      cursor = tokenPattern.lastIndex
      continue
    }

    if (DANGEROUS_TAGS.has(tag)) {
      if (!closingMatch) skippedTag = tag
      cursor = tokenPattern.lastIndex
      continue
    }
    if (token.startsWith('<!--') || !ALLOWED_TAGS.has(tag)) {
      cursor = tokenPattern.lastIndex
      continue
    }
    if (closingMatch) {
      if (tag !== 'br' && tag !== 'img') parts.push(`</${tag}>`)
    } else {
      const selfClosing = /\/\s*>$/.test(token) || tag === 'br' || tag === 'img'
      const attributeSource = token.slice(openingMatch?.[0].length ?? 1, -1)
      parts.push(`<${tag}${sanitizeAttributes(tag, attributeSource)}${selfClosing ? ' />' : '>'}`)
    }
    cursor = tokenPattern.lastIndex
  }

  if (!skippedTag) parts.push(value.slice(cursor))
  return parts.join('')
}

const EXECUTABLE_KEYS = new Set([
  '__html', 'dangerouslysetinnerhtml', 'onerror', 'onload', 'onclick', 'onsubmit',
  'script', 'scripts', 'srcdoc',
])

export function hasUnsafeBuilderCode(value: unknown): boolean {
  const pending: unknown[] = [value]

  while (pending.length > 0) {
    const current = pending.pop()
    if (typeof current === 'function' || typeof current === 'symbol' || typeof current === 'bigint') return true
    if (Array.isArray(current)) {
      pending.push(...current)
      continue
    }
    if (!current || typeof current !== 'object') continue

    for (const [key, child] of Object.entries(current)) {
      if (EXECUTABLE_KEYS.has(key.toLowerCase())) return true
      pending.push(child)
    }
  }

  return false
}
