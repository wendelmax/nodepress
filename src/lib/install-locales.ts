export const INSTALL_LOCALES = [
  {
    code: 'pt-BR',
    nativeName: 'Português do Brasil',
    englishName: 'Portuguese (Brazil)',
    shortCode: 'PT',
  },
  {
    code: 'en-US',
    nativeName: 'English (United States)',
    englishName: 'English (United States)',
    shortCode: 'EN',
  },
  {
    code: 'es-ES',
    nativeName: 'Español',
    englishName: 'Spanish',
    shortCode: 'ES',
  },
  {
    code: 'fr-FR',
    nativeName: 'Français',
    englishName: 'French',
    shortCode: 'FR',
  },
  {
    code: 'de-DE',
    nativeName: 'Deutsch',
    englishName: 'German',
    shortCode: 'DE',
  },
  {
    code: 'it-IT',
    nativeName: 'Italiano',
    englishName: 'Italian',
    shortCode: 'IT',
  },
] as const

export type InstallLocaleCode = (typeof INSTALL_LOCALES)[number]['code']

const aliases: Record<string, InstallLocaleCode> = {
  en: 'en-US',
  'en-us': 'en-US',
  'pt_br': 'pt-BR',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  es: 'es-ES',
  'es-es': 'es-ES',
  fr: 'fr-FR',
  'fr-fr': 'fr-FR',
  de: 'de-DE',
  'de-de': 'de-DE',
  it: 'it-IT',
  'it-it': 'it-IT',
}

export function normalizeInstallLocale(value: string | null | undefined): InstallLocaleCode {
  const candidate = value?.trim()
  if (!candidate) return 'en-US'

  const exact = INSTALL_LOCALES.find((locale) => locale.code === candidate)
  if (exact) return exact.code

  return aliases[candidate.toLowerCase()] ?? 'en-US'
}

export function getInstallLocale(value: string | null | undefined) {
  const code = normalizeInstallLocale(value)
  return INSTALL_LOCALES.find((locale) => locale.code === code) ?? INSTALL_LOCALES[1]
}
