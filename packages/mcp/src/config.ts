import { GENERATOR_LIMITS } from "./core"

export type ServerConfig = {
  outputDir?: string
  maxTextBytes: number
  maxPdfBytes: number
  allowOverwrite: boolean
  qpdfPath?: string
  debug: boolean
}

const DEFAULT_MAX_PDF_BYTES = 100 * 1024 * 1024

function parsePositiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === "") return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function parseBoolean(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true"
}

export function parseConfig(argv: string[], env: NodeJS.ProcessEnv = process.env): ServerConfig {
  let outputDir = env.BLOB_SPAWN_OUTPUT_DIR
  let maxTextBytes = parsePositiveInteger(env.BLOB_SPAWN_MAX_TEXT_BYTES, GENERATOR_LIMITS.maxApplicationBytes, "BLOB_SPAWN_MAX_TEXT_BYTES")
  let maxPdfBytes = parsePositiveInteger(env.BLOB_SPAWN_MAX_PDF_BYTES, DEFAULT_MAX_PDF_BYTES, "BLOB_SPAWN_MAX_PDF_BYTES")
  let allowOverwrite = parseBoolean(env.BLOB_SPAWN_ALLOW_OVERWRITE)
  let qpdfPath = env.BLOB_SPAWN_QPDF || undefined
  let debug = parseBoolean(env.BLOB_SPAWN_DEBUG)

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const [flag, inlineValue] = argument.split("=", 2)
    const value = () => {
      if (inlineValue !== undefined) return inlineValue
      index += 1
      return argv[index]
    }

    switch (flag) {
      case "--output-dir":
        outputDir = value()
        break
      case "--max-text-bytes":
        maxTextBytes = parsePositiveInteger(value(), GENERATOR_LIMITS.maxApplicationBytes, "--max-text-bytes")
        break
      case "--max-pdf-bytes":
        maxPdfBytes = parsePositiveInteger(value(), DEFAULT_MAX_PDF_BYTES, "--max-pdf-bytes")
        break
      case "--allow-overwrite":
        allowOverwrite = true
        break
      case "--qpdf":
        qpdfPath = value()
        break
      case "--debug":
        debug = true
        break
      case "--version":
        break
      default:
        if (flag.startsWith("--")) throw new Error(`Unknown argument: ${flag}`)
    }
  }

  return {
    outputDir: outputDir ? outputDir : undefined,
    maxTextBytes: Math.min(maxTextBytes, GENERATOR_LIMITS.maxApplicationBytes),
    maxPdfBytes: Math.min(maxPdfBytes, GENERATOR_LIMITS.maxApplicationBytes),
    allowOverwrite,
    qpdfPath,
    debug,
  }
}

export function logDebug(config: ServerConfig, ...values: unknown[]) {
  if (!config.debug) return
  console.error("[blob-spawn-mcp]", ...values)
}
