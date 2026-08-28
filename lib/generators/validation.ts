import { GENERATOR_LIMITS, SIZE_UNITS } from "./config"

export type SizeUnit = keyof typeof SIZE_UNITS

export function sizeToBytes(sizeValue: string, unit: SizeUnit) {
  const size = Number(sizeValue)
  if (!Number.isInteger(size) || size <= 0) return null

  const bytes = size * SIZE_UNITS[unit]
  if (!Number.isSafeInteger(bytes)) return null
  return bytes
}

export function validateTargetSize(sizeValue: string, unit: SizeUnit) {
  const bytes = sizeToBytes(sizeValue, unit)
  if (bytes === null) return "SIZE_POSITIVE"
  if (bytes < GENERATOR_LIMITS.minBytes || bytes > GENERATOR_LIMITS.maxInputBytes) {
    return "SIZE_RANGE"
  }
  if (bytes > GENERATOR_LIMITS.maxApplicationBytes) {
    return "SIZE_MAX_EXCEEDED"
  }
  return null
}

export function validatePdfPageCount(value: string) {
  const pages = Number(value)
  if (!Number.isInteger(pages) || pages < 1) return "PAGE_POSITIVE"
  if (pages > GENERATOR_LIMITS.pdfMaxPages) return "PAGE_MAX"
  return null
}

export function normalizePdfText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
}

export function validatePdfText(value: string) {
  const normalized = normalizePdfText(value)
  const bytes = new TextEncoder().encode(normalized).length
  if (normalized.length > GENERATOR_LIMITS.pdfMaxTextCharacters) return "TEXT_TOO_LONG"
  if (bytes > GENERATOR_LIMITS.pdfMaxTextBytes) return "TEXT_TOO_MANY_BYTES"
  if (!normalized.trim()) return "TEXT_EMPTY"
  return null
}
