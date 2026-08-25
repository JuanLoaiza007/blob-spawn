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
  if (bytes === null) return "Introduce un tamaño entero mayor que cero."
  if (bytes < GENERATOR_LIMITS.minBytes || bytes > GENERATOR_LIMITS.maxInputBytes) {
    return "El tamaño debe estar entre 1 KB y 2048 MB."
  }
  if (bytes > GENERATOR_LIMITS.maxApplicationBytes) {
    return "El tamaño supera el máximo permitido por la aplicación."
  }
  return null
}

export function validatePdfPageCount(value: string) {
  const pages = Number(value)
  if (!Number.isInteger(pages) || pages < 1) return "Introduce una cantidad entera de páginas mayor que cero."
  if (pages > GENERATOR_LIMITS.pdfMaxPages) return `La cantidad máxima es de ${GENERATOR_LIMITS.pdfMaxPages.toLocaleString("es-ES")} páginas.`
  return null
}

export function normalizePdfText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
}

export function validatePdfText(value: string) {
  const normalized = normalizePdfText(value)
  const bytes = new TextEncoder().encode(normalized).length
  if (normalized.length > GENERATOR_LIMITS.pdfMaxTextCharacters) return `El texto no puede superar ${GENERATOR_LIMITS.pdfMaxTextCharacters} caracteres.`
  if (bytes > GENERATOR_LIMITS.pdfMaxTextBytes) return `El texto no puede superar ${GENERATOR_LIMITS.pdfMaxTextBytes.toLocaleString("es-ES")} bytes UTF-8.`
  if (!normalized.trim()) return "Introduce un texto de prueba."
  return null
}
