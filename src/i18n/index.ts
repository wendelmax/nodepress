import { ptBR, AdminDictionary } from './dictionaries/pt-BR'
import { enUS } from './dictionaries/en-US'

const dictionaries: Record<string, AdminDictionary> = {
  'pt-BR': ptBR,
  'en-US': enUS,
}

export const getAdminDictionary = (locale: string): AdminDictionary => {
  return dictionaries[locale] || dictionaries['pt-BR']
}

export type { AdminDictionary }
