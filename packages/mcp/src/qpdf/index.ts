import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

import type { ServerConfig } from "../config"
import {
  PDF_SECURITY_PASSWORDS,
  getPdfSecurityArguments,
  type PdfSecurityBackend,
  type PdfSecurityRestrictions,
} from "../core"
import { McpToolError } from "../errors"
import { hasQpdfAssets, runQpdfOnce } from "./runtime"

export type QpdfMode = "wasm" | "binary" | "unavailable"

function findBinary(config: ServerConfig) {
  const candidate = config.qpdfPath ?? "qpdf"
  try {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8", timeout: 10_000 })
    return result.status === 0 ? candidate : undefined
  } catch {
    return undefined
  }
}

export function qpdfMode(config: ServerConfig): QpdfMode {
  if (hasQpdfAssets()) return "wasm"
  return findBinary(config) ? "binary" : "unavailable"
}

export function isSecurityAvailable(config: ServerConfig) {
  return qpdfMode(config) !== "unavailable"
}

let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task)
  queue = result.catch(() => undefined)
  return result
}

async function runWasm(args: string[], input: Uint8Array, outputName: string) {
  const inputName = "input.pdf"
  const outputs = await runQpdfOnce({
    inputs: { [inputName]: input },
    outputs: [outputName],
    args: [...args, "--", inputName, outputName],
  })
  return outputs[outputName]
}

async function runBinary(binary: string, args: string[], input: Uint8Array, outputName: string) {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-qpdf-"))
  const inputPath = join(directory, "input.pdf")
  const outputPath = join(directory, outputName)

  try {
    await writeFile(inputPath, input)
    const result = spawnSync(binary, [...args, "--", inputPath, outputPath], {
      encoding: "buffer",
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    if (result.error?.name === "ETIMEDOUT") {
      throw new McpToolError("QPDF_TIMEOUT", "qpdf timed out")
    }
    if (result.status !== 0 && result.status !== 3) {
      const stderr = result.stderr?.toString("utf8").trim()
      throw new McpToolError("QPDF_FAILED", stderr || `qpdf exited with status ${result.status}`)
    }
    return new Uint8Array(await readFile(outputPath))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

export function createQpdfBackend(config: ServerConfig): PdfSecurityBackend | undefined {
  const mode = qpdfMode(config)
  if (mode === "unavailable") return undefined
  const binary = mode === "binary" ? findBinary(config) : undefined
  if (mode === "binary" && !binary) return undefined
  const fallbackBinary = mode === "wasm" ? findBinary(config) : undefined

  const run = (args: string[], input: Uint8Array, outputName: string) =>
    enqueue(() => (mode === "wasm" ? runWasm(args, input, outputName) : runBinary(binary!, args, input, outputName)))

  const wrap = async (args: string[], input: Uint8Array, outputName: string) => {
    try {
      return await run(args, input, outputName)
    } catch (error) {
      if (mode === "wasm" && fallbackBinary) {
        try {
          return await enqueue(() => runBinary(fallbackBinary, args, input, outputName))
        } catch (fallbackError) {
          throw new McpToolError("QPDF_FAILED", fallbackError instanceof Error ? fallbackError.message : String(fallbackError))
        }
      }
      if (error instanceof McpToolError) throw error
      throw new McpToolError("QPDF_FAILED", error instanceof Error ? error.message : String(error))
    }
  }

  return {
    apply(bytes: Uint8Array, restrictions: PdfSecurityRestrictions) {
      return wrap([...getPdfSecurityArguments(restrictions)], bytes, "secured.pdf")
    },
    decrypt(bytes: Uint8Array) {
      return wrap([`--password=${PDF_SECURITY_PASSWORDS.user}`, "--decrypt"], bytes, "decrypted.pdf")
    },
  }
}
