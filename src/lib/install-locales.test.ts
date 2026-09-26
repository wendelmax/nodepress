import { describe, expect, it } from 'vitest'

import {
  INSTALL_LOCALES,
  getInstallLocale,
  normalizeInstallLocale,
} from './install-locales'

describe('install locale catalog', () => {
  it('offers the initial WordPress-style language set with native labels', () => {
    expect(INSTALL_LOCALES.map((locale) => locale.code)).toEqual([
      'pt-BR',
      'en-US',
      'es-ES',
      'fr-FR',
      'de-DE',
      'it-IT',
    ])
    expect(INSTALL_LOCALES.every((locale) => locale.nativeName.length > 0)).toBe(true)
  })

  it('keeps legacy query-string locale values working', () => {
    expect(normalizeInstallLocale('pt_BR')).toBe('pt-BR')
    expect(normalizeInstallLocale('en')).toBe('en-US')
    expect(getInstallLocale('pt_BR').nativeName).toBe('Português do Brasil')
  })
})
