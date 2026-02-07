import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import trCommon from './locales/tr/common.json'
import trModels from './locales/tr/models.json'
import trLegal from './locales/tr/legal.json'
import enCommon from './locales/en/common.json'
import enModels from './locales/en/models.json'
import enLegal from './locales/en/legal.json'
import deCommon from './locales/de/common.json'
import deModels from './locales/de/models.json'
import deLegal from './locales/de/legal.json'

export const SUPPORTED_LANGUAGES = ['tr', 'en', 'de'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_PREFERENCE_KEY = 'languagePreference'

const resources = {
  tr: {
    common: trCommon,
    models: trModels,
    legal: trLegal,
  },
  en: {
    common: enCommon,
    models: enModels,
    legal: enLegal,
  },
  de: {
    common: deCommon,
    models: deModels,
    legal: deLegal,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['tr', 'en', 'de'],
    defaultNS: 'common',
    ns: ['common', 'models', 'legal'],
    interpolation: {
      escapeValue: false,
    },
  })

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

export function getStoredLanguagePreference(): SupportedLanguage | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(LANGUAGE_PREFERENCE_KEY)
  return stored && isSupportedLanguage(stored) ? stored : null
}

export function setStoredLanguagePreference(lang: SupportedLanguage): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_PREFERENCE_KEY, lang)
  }
}

export function detectBrowserLanguage(): SupportedLanguage {
  const stored = getStoredLanguagePreference()
  if (stored) return stored
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language || 'en'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('tr')) return 'tr'
  return 'en'
}

export default i18n
