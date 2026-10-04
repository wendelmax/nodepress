'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CONSENT_COOKIE_NAME,
  DEFAULT_CONSENT_CHOICES,
  isCategoryAllowed,
  isConsentCurrent,
  normalizeConsentChoices,
  parseConsentCookie,
  serializeConsentCookie,
  type ConsentCategory,
  type ConsentChoices,
  type ConsentCookie,
} from './consent-state'
import { getConsentDictionary } from './i18n'
import { DEFAULT_CONSENT_CONFIG, type ConsentConfig } from './consent-service'

export interface ConsentScriptDefinition {
  id: string
  category: Exclude<ConsentCategory, 'necessary'>
  src?: string
  content?: string
  attributes?: Record<string, string>
}

interface ConsentDocument {
  createElement(tagName: string): {
    textContent: string
    setAttribute(name: string, value: string): void
    remove?(): void
  }
  head: { appendChild(element: unknown): unknown }
  querySelectorAll(selector: string): ArrayLike<{ remove?(): void }>
}

export interface ConsentScriptRegistry {
  register(definition: ConsentScriptDefinition): () => void
  setChoices(choices: ConsentChoices): void
}

export function getConsentPresentationState(cookieValue: string | null, policyVersion: string): {
  showBanner: boolean
  choices: ConsentChoices
} {
  const cookie = parseConsentCookie(cookieValue)
  if (!cookie || !isConsentCurrent(cookie, policyVersion)) return { showBanner: true, choices: DEFAULT_CONSENT_CHOICES }
  return { showBanner: false, choices: cookie.choices }
}

function isSafeScriptSource(src: string): boolean {
  return /^https:\/\//i.test(src)
}

export function createConsentScriptRegistry(documentRef: ConsentDocument, initialChoices: ConsentChoices): ConsentScriptRegistry {
  const definitions = new Map<string, ConsentScriptDefinition>()
  let choices = normalizeConsentChoices(initialChoices)

  const remove = (id: string) => {
    const nodes = documentRef.querySelectorAll(`[data-nodepress-consent-script="${id}"]`)
    for (let index = 0; index < nodes.length; index += 1) nodes[index]?.remove?.()
  }

  const sync = () => {
    for (const definition of definitions.values()) remove(definition.id)
    for (const definition of definitions.values()) {
      if (!isCategoryAllowed({ policyVersion: '', choices, decidedAt: '' }, definition.category)) continue
      if ((!definition.src && !definition.content) || (definition.src && !isSafeScriptSource(definition.src))) continue
      const script = documentRef.createElement('script')
      script.setAttribute('data-nodepress-consent-script', definition.id)
      if (definition.src) script.setAttribute('src', definition.src)
      for (const [name, value] of Object.entries(definition.attributes ?? {})) script.setAttribute(name, value)
      script.textContent = definition.content ?? ''
      documentRef.head.appendChild(script)
    }
  }

  return {
    register(definition) {
      if (!definition.id || (!definition.src && !definition.content)) return () => undefined
      definitions.set(definition.id, definition)
      sync()
      return () => {
        definitions.delete(definition.id)
        remove(definition.id)
      }
    },
    setChoices(nextChoices) {
      choices = normalizeConsentChoices(nextChoices)
      sync()
    },
  }
}

function readCookie(): string | null {
  return document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))?.slice(CONSENT_COOKIE_NAME.length + 1) ?? null
}

function writeCookie(cookie: ConsentCookie): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=${serializeConsentCookie(cookie)}; Max-Age=31536000; Path=/; SameSite=Lax`
}

function analyticsScripts(analyticsId: string): ConsentScriptDefinition[] {
  if (!/^G-[A-Z0-9-]+$/i.test(analyticsId)) return []
  return [
    { id: 'google-analytics-loader', category: 'analytics', src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`, attributes: { async: 'true' } },
    { id: 'google-analytics-init', category: 'analytics', content: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${analyticsId}');` },
  ]
}

declare global {
  interface Window {
    NodePressConsent?: {
      isAllowed(category: ConsentCategory): boolean
      subscribe(listener: () => void): () => void
      registerScript(definition: ConsentScriptDefinition): () => void
    }
  }
}

export function ConsentManager({ locale, analyticsId }: { locale: string; analyticsId?: string }) {
  const dictionary = useMemo(() => getConsentDictionary(locale), [locale])
  const [config, setConfig] = useState<ConsentConfig>(DEFAULT_CONSENT_CONFIG)
  const [cookie, setCookie] = useState<ConsentCookie | undefined>(() => typeof document === 'undefined' ? undefined : parseConsentCookie(readCookie()))
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ConsentChoices>(cookie?.choices ?? DEFAULT_CONSENT_CHOICES)
  const [error, setError] = useState<string | null>(null)
  const registryRef = useRef<ConsentScriptRegistry | null>(null)
  const cookieRef = useRef(cookie)
  const listenersRef = useRef(new Set<() => void>())

  cookieRef.current = cookie

  useEffect(() => {
    let active = true
    void fetch('/api/plugins/lgpd-consent/config')
      .then((response) => response.ok ? response.json() : DEFAULT_CONSENT_CONFIG)
      .then((nextConfig: ConsentConfig) => {
        if (!active) return
        setConfig(nextConfig)
        const nextCookie = parseConsentCookie(readCookie())
        setCookie(nextCookie)
        setDraft(nextCookie?.choices ?? DEFAULT_CONSENT_CHOICES)
        setReady(true)
      })
      .catch(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  const choices = cookie?.choices ?? DEFAULT_CONSENT_CHOICES
  const showBanner = !isConsentCurrent(cookie, config.policyVersion) || open

  useEffect(() => {
    if (!ready) return
    const registry = createConsentScriptRegistry(document, choices)
    for (const script of analyticsScripts(analyticsId ?? '')) registry.register(script)
    registryRef.current = registry
    window.NodePressConsent = {
      isAllowed: (category) => isCategoryAllowed(cookieRef.current, category),
      subscribe: (listener) => {
        listenersRef.current.add(listener)
        return () => listenersRef.current.delete(listener)
      },
      registerScript: (definition) => registry.register(definition),
    }
    return () => {
      registryRef.current = null
      delete window.NodePressConsent
    }
  }, [analyticsId, ready])

  useEffect(() => {
    registryRef.current?.setChoices(choices)
    for (const listener of listenersRef.current) listener()
  }, [choices])

  async function save(nextChoices: ConsentChoices, decision: 'save' | 'accept-all' | 'reject-all' | 'revoke') {
    setError(null)
    const response = await fetch('/api/plugins/lgpd-consent/record', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choices: nextChoices, locale, decision }),
    })
    if (!response.ok) {
      setError('Não foi possível salvar sua escolha.')
      return
    }
    const nextCookie = { policyVersion: config.policyVersion, choices: nextChoices, decidedAt: new Date().toISOString() }
    writeCookie(nextCookie)
    setCookie(nextCookie)
    setDraft(nextChoices)
    setOpen(false)
  }

  if (!ready) return null

  return showBanner ? (
    <section role="dialog" aria-label={dictionary.title} className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-border bg-background-secondary p-5 text-text shadow-2xl">
      <h2 className="text-lg font-semibold">{open ? dictionary.settingsTitle : dictionary.title}</h2>
      <p className="mt-2 text-sm text-text-secondary">{dictionary.description}</p>
      {config.policyUrl && <a className="mt-2 inline-block text-sm text-primary-light underline" href={config.policyUrl}>{dictionary.policy}</a>}
      {open && <fieldset className="mt-4 grid gap-3" aria-label={dictionary.settingsTitle}>
        {(['necessary', 'analytics', 'preferences', 'marketing'] as const).map((category) => {
          const label = dictionary[category]
          const description = dictionary[`${category}Description` as keyof typeof dictionary] as string
          return <label key={category} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={draft[category]} disabled={category === 'necessary'} onChange={(event) => setDraft({ ...draft, [category]: event.target.checked })} /><span><span className="font-medium">{label}</span><span className="block text-xs text-text-secondary">{description}</span></span></label>
        })}
      </fieldset>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <p className="mt-3 text-xs text-text-muted">{dictionary.disclaimer}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!open && <button type="button" onClick={() => save(DEFAULT_CONSENT_CHOICES, 'reject-all')} className="rounded-lg border border-border px-3 py-2 text-sm">{dictionary.rejectOptional}</button>}
        {!open && <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border px-3 py-2 text-sm">{dictionary.manage}</button>}
        {open && <button type="button" onClick={() => save(draft, Object.values(draft).every((value) => !value) ? 'revoke' : 'save')} className="rounded-lg border border-border px-3 py-2 text-sm">{dictionary.savePreferences}</button>}
        {!open && <button type="button" onClick={() => save({ necessary: true, analytics: true, preferences: true, marketing: true }, 'accept-all')} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">{dictionary.acceptAll}</button>}
      </div>
    </section>
  ) : <button type="button" aria-label={dictionary.reopen} onClick={() => { setDraft(choices); setOpen(true) }} className="fixed bottom-4 right-4 z-[90] rounded-full border border-border bg-background-secondary px-3 py-2 text-xs text-text shadow-lg">{dictionary.reopen}</button>
}
