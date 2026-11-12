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
  bytes: Uint8Array
  blob: Blob
  extension: GeneratorConfig["extension"]
  mimeType: string
}

const encoder = new TextEncoder()
const LOREM_PATTERN = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n"
const SEQUENCE_PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n"
const DEFAULT_CHUNK_SIZE = 1024 * 1024

function repeatInto(output: Uint8Array, patternBytes: Uint8Array, start = 0, length = output.length - start) {
  if (patternBytes.length === 0) return
  for (let offset = start; offset < start + length; offset += patternBytes.length) {
    output.set(patternBytes.subarray(0, Math.min(patternBytes.length, start + length - offset)), offset)
  }
}

function* filledChunks(pattern: string, length: number, chunkSize = DEFAULT_CHUNK_SIZE): Generator<Uint8Array> {
  if (length < 0) throw new AppError("TEXT_FILE_TOO_SMALL")
  const patternBytes = encoder.encode(pattern)
  let remaining = length
  while (remaining > 0) {
    const size = Math.min(chunkSize, remaining)
    const chunk = new Uint8Array(size)
    repeatInto(chunk, patternBytes)
    remaining -= size
    yield chunk
  }
}

function* csvChunks(targetBytes: number, csvHeader: string, chunkSize = DEFAULT_CHUNK_SIZE): Generator<Uint8Array> {
  const header = `${csvHeader}\n`
  const headerBytes = encoder.encode(header)
  const row = encoder.encode("A\n")

  if (targetBytes < headerBytes.length + 1) {
    throw new AppError("TEXT_FILE_TOO_SMALL")
  }

  let remaining = targetBytes
  yield headerBytes
  remaining -= headerBytes.length

  while (remaining > row.length) {
    const rows = Math.floor(Math.min(chunkSize, remaining - 1) / row.length)
    const chunk = new Uint8Array(rows * row.length)
    repeatInto(chunk, row)
    yield chunk
    remaining -= chunk.length
  }

  if (remaining > 0) yield new Uint8Array(remaining).fill(65)
}

function* jsonChunks(targetBytes: number, jsonKey: string): Generator<Uint8Array> {
  const safeKey = JSON.stringify(sanitizeJsonKey(jsonKey))
  const prefix = encoder.encode(`{${safeKey}:"`)
  const suffix = encoder.encode(`"}`)
  const fieldBytes = targetBytes - prefix.length - suffix.length

  if (fieldBytes < 0) throw new AppError("TEXT_FILE_TOO_SMALL")

  yield prefix
  yield* filledChunks("A", fieldBytes)
  yield suffix
}

function* plainChunks(targetBytes: number, contentSource: string): Generator<Uint8Array> {
  yield* filledChunks(contentSource === "sequence" ? SEQUENCE_PATTERN : LOREM_PATTERN, targetBytes)
}

/**
 * Emits the exact bytes of a text generator in bounded chunks so Node consumers
 * can write large files without allocating the whole payload.
 */
export function* textChunks(options: TextGeneratorOptions, chunkSize = DEFAULT_CHUNK_SIZE): Generator<Uint8Array> {
  switch (options.type) {
    case "txt":
      yield* plainChunks(options.targetBytes, options.contentSource ?? "lorem")
      break
    case "json":
      yield* jsonChunks(options.targetBytes, options.jsonKey ?? "data")
      break
    case "csv":
      yield* csvChunks(options.targetBytes, sanitizeCsvHeader(options.csvHeader ?? "data"), chunkSize)
      break
    default:
      throw new AppError("TEXT_FILE_WRONG_GENERATOR")
  }
}

function sanitizeJsonKey(value: string) {
  const key = value.trim().replace(/[^\p{L}\p{N}_-]/gu, "")
  return key || "data"
}

function sanitizeCsvHeader(value: string) {
  const header = value.trim().replace(/[^\p{L}\p{N}_-]/gu, "")
  return header || "data"
}

export function generateTextFile(options: TextGeneratorOptions, config: GeneratorConfig): GeneratedFile {
  const chunks = [...textChunks(options)]
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)

  if (total !== options.targetBytes) {
    throw new AppError("TEXT_EXACT_SIZE_FAILED")
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: config.mimeType })

  if (blob.size !== options.targetBytes) {
    throw new AppError("TEXT_EXACT_SIZE_FAILED")
  }

  return { bytes, blob, extension: config.extension, mimeType: config.mimeType }
}
