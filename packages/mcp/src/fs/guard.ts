import { lstat, mkdir, realpath } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"

import { parseFilenameBase } from "../core"
import type { ServerConfig } from "../config"
import { McpToolError } from "../errors"

const WINDOWS_RESERVED = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  ...Array.from({ length: 9 }, (_, index) => `COM${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `LPT${index + 1}`),
  "CONIN$",
  "CONOUT$",
])

export type ResolveOutputOptions = {
  filename?: string
  extension: `.${string}`
  subdir?: string
  overwrite?: boolean
}

export type ResolvedOutput = {
  path: string
  filename: string
  directory: string
}

function normalizeSubdir(subdir: string | undefined) {
  if (!subdir) return ""
  if (isAbsolute(subdir) || /^[A-Za-z]:[\\/]/.test(subdir)) {
    throw new McpToolError("OUTPUT_OUTSIDE_ROOT", "subdir must be relative to the configured output directory")
  }

  const segments = subdir.split(/[\\/]+/).filter(Boolean)
  const normalized: string[] = []

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new McpToolError("OUTPUT_OUTSIDE_ROOT", "subdir must not contain traversal segments")
    }
    const safe = parseFilenameBase(segment)
    if (!safe) {
      throw new McpToolError("OUTPUT_OUTSIDE_ROOT", `Invalid subdirectory segment: ${segment}`)
    }
    normalized.push(safe)
  }

  return normalized.join(sep)
}

function validateFilenameBase(filename: string) {
  const base = parseFilenameBase(filename).slice(0, 80)
  if (!base) {
    throw new McpToolError("INVALID_FILENAME", "filename must contain letters, numbers, underscores, or hyphens")
  }

  const upper = base.toUpperCase()
  if (WINDOWS_RESERVED.has(upper)) {
    throw new McpToolError("INVALID_FILENAME", `${base} is a reserved filename on Windows`)
  }
  if (base.endsWith(".") || base.endsWith(" ")) {
    throw new McpToolError("INVALID_FILENAME", "filename must not end with a dot or space")
  }

  return base
}

async function assertInside(root: string, directory: string) {
  const relativePath = relative(root, directory)
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new McpToolError("OUTPUT_OUTSIDE_ROOT", "resolved output path escapes the configured directory")
  }
}

export async function resolveOutput(config: ServerConfig, options: ResolveOutputOptions): Promise<ResolvedOutput> {
  if (!config.outputDir) {
    throw new McpToolError(
      "OUTPUT_DIR_NOT_CONFIGURED",
      "No output directory is configured",
      "Set BLOB_SPAWN_OUTPUT_DIR or pass --output-dir <absolute-path> when launching blob-spawn-mcp.",
    )
  }

  const root = resolve(config.outputDir)
  await mkdir(root, { recursive: true })
  const rootReal = await realpath(root)

  const subdir = normalizeSubdir(options.subdir)
  const directory = resolve(rootReal, subdir)
  await mkdir(directory, { recursive: true })
  const directoryReal = await realpath(directory)
  await assertInside(rootReal, directoryReal)

  const base = validateFilenameBase(options.filename ?? "blob")
  const filename = `${base}${options.extension}`
  const destination = join(directoryReal, filename)
  const overwrite = options.overwrite ?? config.allowOverwrite

  try {
    await lstat(destination)
    if (!overwrite) {
      throw new McpToolError("OUTPUT_EXISTS", `${filename} already exists`, "Pass overwrite: true to replace it.")
    }
  } catch (error) {
    if (error instanceof McpToolError) throw error
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  return { path: destination, filename, directory: directoryReal }
}
