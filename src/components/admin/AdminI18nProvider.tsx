"use client"

import React, { createContext, useContext } from 'react'
import type { AdminDictionary } from '@/i18n'

interface I18nContextProps {
  t: AdminDictionary
  lang: string
}

const I18nContext = createContext<I18nContextProps | null>(null)

export function AdminI18nProvider({ 
  children, 
  dictionary,
  lang 
}: { 
  children: React.ReactNode
  dictionary: AdminDictionary
  lang: string
}) {
  return (
    <I18nContext.Provider value={{ t: dictionary, lang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useAdminTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useAdminTranslation must be used within an AdminI18nProvider')
  }
  return context
}
