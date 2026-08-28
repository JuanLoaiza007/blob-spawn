import type { FileType, GeneratorConfig } from "./config"
import { AppError } from "./errors"

export type TextGeneratorOptions = {
  type: FileType
  targetBytes: number
  contentSource?: string
  jsonKey?: string
  csvHeader?: string
}

export type GeneratedFile = {
  blob: Blob
  extension: GeneratorConfig["extension"]
  mimeType: string
}

const encoder = new TextEncoder()
const LOREM_PATTERN = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n"
const SEQUENCE_PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n"

function repeatAscii(targetBytes: number, pattern: string) {
  const patternBytes = encoder.encode(pattern)
  const output = new Uint8Array(targetBytes)

  for (let offset = 0; offset < targetBytes; offset += patternBytes.length) {
    output.set(patternBytes.subarray(0, Math.min(patternBytes.length, targetBytes - offset)), offset)
  }

  return output
}

function bytesWithAsciiField(prefix: string, suffix: string, targetBytes: number) {
  const prefixBytes = encoder.encode(prefix)
  const suffixBytes = encoder.encode(suffix)
  const fieldBytes = targetBytes - prefixBytes.length - suffixBytes.length

  if (fieldBytes < 0) {
    throw new AppError("TEXT_FILE_TOO_SMALL")
  }

  const output = new Uint8Array(targetBytes)
  output.set(prefixBytes)
  output.set(repeatAscii(fieldBytes, "A"), prefixBytes.length)
  output.set(suffixBytes, targetBytes - suffixBytes.length)
  return output
}

function sanitizeJsonKey(value: string) {
  const key = value.trim().replace(/[^\p{L}\p{N}_-]/gu, "")
  return key || "data"
}

function sanitizeCsvHeader(value: string) {
  const header = value.trim().replace(/[^\p{L}\p{N}_-]/gu, "")
  return header || "data"
}

function generatePlainText(targetBytes: number, contentSource: string) {
  return repeatAscii(targetBytes, contentSource === "sequence" ? SEQUENCE_PATTERN : LOREM_PATTERN)
}

function generateJson(targetBytes: number, jsonKey: string) {
  const safeKey = JSON.stringify(sanitizeJsonKey(jsonKey))
  return bytesWithAsciiField(`{${safeKey}:"`, `"}`, targetBytes)
}

function generateCsv(targetBytes: number, csvHeader: string) {
  const header = `${sanitizeCsvHeader(csvHeader)}\n`
  const headerBytes = encoder.encode(header)

  if (targetBytes < headerBytes.length + 1) {
    throw new AppError("TEXT_FILE_TOO_SMALL")
  }

  const output = new Uint8Array(targetBytes)
  output.set(headerBytes)
  let offset = headerBytes.length
  const row = encoder.encode("A\n")

  while (targetBytes - offset > row.length) {
    output.set(row, offset)
    offset += row.length
  }

  output.set(repeatAscii(targetBytes - offset, "A"), offset)
  return output
}

export function generateTextFile(options: TextGeneratorOptions, config: GeneratorConfig): GeneratedFile {
  let bytes: Uint8Array

  switch (options.type) {
    case "txt":
      bytes = generatePlainText(options.targetBytes, options.contentSource ?? "lorem")
      break
    case "json":
      bytes = generateJson(options.targetBytes, options.jsonKey ?? "data")
      break
    case "csv":
      bytes = generateCsv(options.targetBytes, options.csvHeader ?? "data")
      break
    default:
      throw new AppError("TEXT_FILE_WRONG_GENERATOR")
  }

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: config.mimeType })

  if (blob.size !== options.targetBytes) {
    throw new AppError("TEXT_EXACT_SIZE_FAILED")
  }

  return { blob, extension: config.extension, mimeType: config.mimeType }
}
