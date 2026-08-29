"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { type Dictionary, type Locale, DEFAULT_LOCALE, getDictionary, isLocale, normalizeLocale } from "./dictionaries"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
  dict: Dictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem("blobspawn-locale")
    if (stored && isLocale(stored)) return stored
  } catch {
    // localStorage unavailable
  }
  const lang = typeof navigator !== "undefined" ? navigator.language : ""
  return lang ? normalizeLocale(lang) : DEFAULT_LOCALE
}

function resolveKey(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".")
  let value: unknown = dict
  for (const part of parts) {
    if (value === null || typeof value !== "object") return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return typeof value === "string" ? value : undefined
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const detected = detectLocale()
    if (detected !== DEFAULT_LOCALE) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(detected)
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem("blobspawn-locale", next)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const dict = useMemo(() => getDictionary(locale), [locale])

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      const resolved = resolveKey(dict, key)
      return resolved !== undefined ? interpolate(resolved, params) : key
    },
    [dict],
  )

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t, dict }), [locale, setLocale, t, dict])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}