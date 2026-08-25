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
