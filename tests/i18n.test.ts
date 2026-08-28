import { describe, expect, it } from "vitest"
import { getDictionary, isLocale, normalizeLocale } from "../lib/i18n/dictionaries"

describe("i18n dictionaries", () => {
  it("provides a dictionary for each supported locale", () => {
    const es = getDictionary("es")
    const en = getDictionary("en")
    expect(es).toBeDefined()
    expect(en).toBeDefined()
    expect(es.home.headline).toBe("Prueba los límites. Sin subir nada.")
    expect(en.home.headline).toBe("Test the limits. Without uploading anything.")
  })

  it("has identical top-level keys between locales", () => {
    const es = getDictionary("es")
    const en = getDictionary("en")
    const esKeys = Object.keys(es).sort()
    const enKeys = Object.keys(en).sort()
    expect(esKeys).toEqual(enKeys)
  })

  it("has identical error keys between locales", () => {
    const es = getDictionary("es")
    const en = getDictionary("en")
    expect(Object.keys(es.errors).sort()).toEqual(Object.keys(en.errors).sort())
  })
})

describe("locale detection", () => {
  it("validates supported locale codes", () => {
    expect(isLocale("es")).toBe(true)
    expect(isLocale("en")).toBe(true)
    expect(isLocale("fr")).toBe(false)
    expect(isLocale("")).toBe(false)
  })

  it("normalizes browser language strings", () => {
    expect(normalizeLocale("es")).toBe("es")
    expect(normalizeLocale("en")).toBe("en")
    expect(normalizeLocale("es-MX")).toBe("es")
    expect(normalizeLocale("en-US")).toBe("en")
    expect(normalizeLocale("en-GB")).toBe("en")
    expect(normalizeLocale("fr")).toBe("en")
    expect(normalizeLocale("fr-FR")).toBe("en")
    expect(normalizeLocale("")).toBe("en")
  })
})