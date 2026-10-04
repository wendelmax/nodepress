import { normalizeInstallLocale, type InstallLocaleCode } from '@/lib/install-locales'

export interface ConsentDictionary {
  title: string
  description: string
  settingsTitle: string
  necessary: string
  necessaryDescription: string
  analytics: string
  analyticsDescription: string
  preferences: string
  preferencesDescription: string
  marketing: string
  marketingDescription: string
  acceptAll: string
  rejectOptional: string
  manage: string
  savePreferences: string
  reopen: string
  policy: string
  disclaimer: string
}

const dictionaries: Record<InstallLocaleCode, ConsentDictionary> = {
  'pt-BR': {
    title: 'Sua privacidade importa', description: 'Usamos cookies e scripts opcionais para melhorar o site. Você escolhe o que autorizar.', settingsTitle: 'Preferências de privacidade',
    necessary: 'Necessários', necessaryDescription: 'Mantêm o site seguro e funcionando.', analytics: 'Analytics', analyticsDescription: 'Ajuda a entender o uso do site de forma agregada.', preferences: 'Preferências', preferencesDescription: 'Lembra escolhas para melhorar sua experiência.', marketing: 'Marketing', marketingDescription: 'Permite recursos e conteúdos de parceiros.',
    acceptAll: 'Aceitar todos', rejectOptional: 'Rejeitar opcionais', manage: 'Gerenciar preferências', savePreferences: 'Salvar preferências', reopen: 'Preferências de privacidade', policy: 'Ver política de privacidade', disclaimer: 'Este recurso técnico não substitui uma avaliação jurídica da sua política de privacidade.',
  },
  'en-US': {
    title: 'Your privacy matters', description: 'We use optional cookies and scripts to improve the site. You choose what to allow.', settingsTitle: 'Privacy preferences',
    necessary: 'Necessary', necessaryDescription: 'Keep the site secure and working.', analytics: 'Analytics', analyticsDescription: 'Help us understand site use in aggregate.', preferences: 'Preferences', preferencesDescription: 'Remember choices to improve your experience.', marketing: 'Marketing', marketingDescription: 'Enable partner features and content.',
    acceptAll: 'Accept all', rejectOptional: 'Reject optional', manage: 'Manage preferences', savePreferences: 'Save preferences', reopen: 'Privacy preferences', policy: 'View privacy policy', disclaimer: 'This technical feature does not replace a legal review of your privacy policy.',
  },
  'es-ES': {
    title: 'Tu privacidad importa', description: 'Usamos cookies y scripts opcionales para mejorar el sitio. Tú eliges qué permitir.', settingsTitle: 'Preferencias de privacidad',
    necessary: 'Necesarias', necessaryDescription: 'Mantienen el sitio seguro y funcionando.', analytics: 'Analítica', analyticsDescription: 'Ayuda a entender el uso agregado del sitio.', preferences: 'Preferencias', preferencesDescription: 'Recuerda opciones para mejorar tu experiencia.', marketing: 'Marketing', marketingDescription: 'Activa funciones y contenido de socios.',
    acceptAll: 'Aceptar todas', rejectOptional: 'Rechazar opcionales', manage: 'Gestionar preferencias', savePreferences: 'Guardar preferencias', reopen: 'Preferencias de privacidad', policy: 'Ver política de privacidad', disclaimer: 'Esta función técnica no sustituye una revisión jurídica de tu política.',
  },
  'fr-FR': {
    title: 'Votre vie privée compte', description: 'Nous utilisons des cookies et scripts optionnels pour améliorer le site. Vous choisissez.', settingsTitle: 'Préférences de confidentialité',
    necessary: 'Nécessaires', necessaryDescription: 'Assurent le fonctionnement et la sécurité du site.', analytics: 'Analytique', analyticsDescription: 'Aident à comprendre l’usage global du site.', preferences: 'Préférences', preferencesDescription: 'Mémorisent vos choix pour améliorer votre expérience.', marketing: 'Marketing', marketingDescription: 'Activent les fonctions et contenus de partenaires.',
    acceptAll: 'Tout accepter', rejectOptional: 'Refuser les optionnels', manage: 'Gérer les préférences', savePreferences: 'Enregistrer les préférences', reopen: 'Préférences de confidentialité', policy: 'Voir la politique de confidentialité', disclaimer: 'Cette fonction technique ne remplace pas un avis juridique.',
  },
  'de-DE': {
    title: 'Ihre Privatsphäre ist wichtig', description: 'Wir verwenden optionale Cookies und Skripte. Sie entscheiden, was erlaubt wird.', settingsTitle: 'Datenschutzeinstellungen',
    necessary: 'Erforderlich', necessaryDescription: 'Halten die Website sicher und funktionsfähig.', analytics: 'Analyse', analyticsDescription: 'Helfen uns, die Nutzung zusammengefasst zu verstehen.', preferences: 'Präferenzen', preferencesDescription: 'Speichern Ihre Auswahl für eine bessere Nutzung.', marketing: 'Marketing', marketingDescription: 'Ermöglichen Funktionen und Inhalte von Partnern.',
    acceptAll: 'Alle akzeptieren', rejectOptional: 'Optionale ablehnen', manage: 'Einstellungen verwalten', savePreferences: 'Einstellungen speichern', reopen: 'Datenschutzeinstellungen', policy: 'Datenschutzerklärung ansehen', disclaimer: 'Diese technische Funktion ersetzt keine rechtliche Prüfung.',
  },
  'it-IT': {
    title: 'La tua privacy è importante', description: 'Usiamo cookie e script opzionali per migliorare il sito. Scegli cosa consentire.', settingsTitle: 'Preferenze sulla privacy',
    necessary: 'Necessari', necessaryDescription: 'Mantengono il sito sicuro e funzionante.', analytics: 'Analisi', analyticsDescription: 'Aiutano a capire l’uso aggregato del sito.', preferences: 'Preferenze', preferencesDescription: 'Ricordano le scelte per migliorare l’esperienza.', marketing: 'Marketing', marketingDescription: 'Abilitano funzioni e contenuti dei partner.',
    acceptAll: 'Accetta tutti', rejectOptional: 'Rifiuta gli opzionali', manage: 'Gestisci preferenze', savePreferences: 'Salva preferenze', reopen: 'Preferenze sulla privacy', policy: 'Vedi informativa privacy', disclaimer: 'Questa funzione tecnica non sostituisce una verifica legale.',
  },
}

export function getConsentDictionary(locale: string): ConsentDictionary {
  const candidate = locale.trim().toLowerCase()
  const supported = Object.keys(dictionaries).some((code) => code.toLowerCase() === candidate)
    || ['pt', 'pt_br', 'pt-br', 'en', 'en-us', 'es', 'es-es', 'fr', 'fr-fr', 'de', 'de-de', 'it', 'it-it'].includes(candidate)
  return supported ? dictionaries[normalizeInstallLocale(locale)] : dictionaries['pt-BR']
}
