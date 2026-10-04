import { describe, expect, it } from 'vitest'
import { getConsentDictionary } from './i18n'

describe('consent banner translations', () => {
  it('returns complete labels for every existing install locale', () => {
    for (const locale of ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT']) {
      const dictionary = getConsentDictionary(locale)
      expect(dictionary.title.length).toBeGreaterThan(0)
      expect(dictionary.acceptAll.length).toBeGreaterThan(0)
      expect(dictionary.rejectOptional.length).toBeGreaterThan(0)
      expect(dictionary.savePreferences.length).toBeGreaterThan(0)
      expect(dictionary.reopen.length).toBeGreaterThan(0)
    }
  })

  it('falls back to Portuguese for unsupported locales', () => {
    expect(getConsentDictionary('xx-XX')).toEqual(getConsentDictionary('pt-BR'))
  })
})
