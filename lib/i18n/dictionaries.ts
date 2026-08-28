import es from "./es.json"
import en from "./en.json"

export type Locale = "es" | "en"

export type Dictionary = typeof es

const dictionaries: Record<Locale, Dictionary> = { es, en }

export const DEFAULT_LOCALE: Locale = "en"

export function isLocale(value: string): value is Locale {
  return value === "es" || value === "en"
}

export function normalizeLocale(value: string): Locale {
  const lang = value.slice(0, 2).toLowerCase()
  return isLocale(lang) ? lang : DEFAULT_LOCALE
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export function getAvailableLocales(): Locale[] {
  return ["es", "en"]
}

export type I18nKey = keyof Dictionary | string