import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import trCommon from "./locales/tr/common.json";
import deCommon from "./locales/de/common.json";

export const SUPPORTED_LANGUAGES = ["en", "tr", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_PREFERENCE_KEY = "zihin_lang";

const resources = {
  en: { common: enCommon },
  tr: { common: trCommon },
  de: { common: deCommon },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "tr", "de"],
  defaultNS: "common",
  ns: ["common"],
  interpolation: {
    escapeValue: false,
  },
});

export function isSupportedLanguage(
  lang: string
): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function getStoredLanguagePreference(): SupportedLanguage | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  return stored && isSupportedLanguage(stored) ? stored : null;
}

export function setStoredLanguagePreference(lang: SupportedLanguage): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LANGUAGE_PREFERENCE_KEY, lang);
  }
}

export function detectBrowserLanguage(): SupportedLanguage {
  const stored = getStoredLanguagePreference();
  if (stored) return stored;
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "en";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("tr")) return "tr";
  return "en";
}

export default i18n;
