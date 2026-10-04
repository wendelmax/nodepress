import { describe, expect, it } from 'vitest'
import { DEFAULT_CONSENT_CHOICES } from './consent-state'
import {
  createConsentScriptRegistry,
  getConsentPresentationState,
  type ConsentScriptDefinition,
} from './ConsentManager'

class FakeDocument {
  readonly scripts: Array<{ attrs: Record<string, string>; textContent: string }> = []
  readonly head = {
    appendChild: (element: { attrs: Record<string, string>; textContent: string }) => {
      this.scripts.push(element)
      return element
    },
  }

  createElement() {
    const element = {
      attrs: {} as Record<string, string>,
      textContent: '',
      setAttribute: (name: string, value: string) => { element.attrs[name] = value },
    }
    return element
  }

  querySelectorAll(selector: string) {
    const id = selector.match(/data-nodepress-consent-script="([^"]+)"/)?.[1]
    return this.scripts
      .filter((script) => script.attrs['data-nodepress-consent-script'] === id)
      .map((script) => ({ remove: () => {
        const index = this.scripts.indexOf(script)
        if (index >= 0) this.scripts.splice(index, 1)
      } }))
  }
}

const analyticsScript: ConsentScriptDefinition = {
  id: 'analytics-widget',
  category: 'analytics',
  src: 'https://analytics.example.test/script.js',
}

describe('public consent manager', () => {
  it('shows the banner on first visit and when policy version is stale', () => {
    expect(getConsentPresentationState(null, '2')).toEqual({
      showBanner: true,
      choices: DEFAULT_CONSENT_CHOICES,
    })
  })

  it('does not inject optional scripts before consent', () => {
    const documentRef = new FakeDocument()
    const registry = createConsentScriptRegistry(documentRef as never, DEFAULT_CONSENT_CHOICES)
    registry.register(analyticsScript)

    expect(documentRef.scripts).toHaveLength(0)
  })

  it('injects a partially accepted category and removes it after revocation', () => {
    const documentRef = new FakeDocument()
    const registry = createConsentScriptRegistry(documentRef as never, DEFAULT_CONSENT_CHOICES)
    registry.register(analyticsScript)

    registry.setChoices({ ...DEFAULT_CONSENT_CHOICES, analytics: true })
    expect(documentRef.scripts).toHaveLength(1)
    expect(documentRef.scripts[0].attrs.src).toBe(analyticsScript.src)

    registry.setChoices(DEFAULT_CONSENT_CHOICES)
    expect(documentRef.scripts).toHaveLength(0)
  })

  it('gates inline initialization scripts as well as external sources', () => {
    const documentRef = new FakeDocument()
    const registry = createConsentScriptRegistry(documentRef as never, DEFAULT_CONSENT_CHOICES)
    registry.register({ id: 'analytics-init', category: 'analytics', content: 'window.analyticsReady=true' })

    expect(documentRef.scripts).toHaveLength(0)
    registry.setChoices({ ...DEFAULT_CONSENT_CHOICES, analytics: true })
    expect(documentRef.scripts).toHaveLength(1)
    expect(documentRef.scripts[0].textContent).toContain('analyticsReady')
  })
})
