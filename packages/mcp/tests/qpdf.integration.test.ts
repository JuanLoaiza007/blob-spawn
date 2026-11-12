import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { PDFDocument } from "pdf-lib"
import { afterEach, describe, expect, it } from "vitest"

import type { ServerConfig } from "../src/config"
import { DEFAULT_PDF_SECURITY, PDF_SECURITY_PASSWORDS, generatePdf } from "../src/core"
import { createQpdfBackend, isSecurityAvailable, qpdfMode } from "../src/qpdf"

const directories: string[] = []

async function config(): Promise<ServerConfig> {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-mcp-qpdf-"))
  directories.push(directory)
  return {
    outputDir: directory,
    maxTextBytes: 1_000_000,
    maxPdfBytes: 1_000_000,
    allowOverwrite: false,
    debug: false,
  }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

const available = (() => {
  try {
    return isSecurityAvailable({
      maxTextBytes: 1_000_000,
      maxPdfBytes: 1_000_000,
      allowOverwrite: false,
      debug: false,
    })
  } catch {
    return false
  }
})()

describe.skipIf(!available)("PDF encryption backend", () => {
  it("encrypts a PDF with the fixed passwords and decrypts it for verification", async () => {
    const backend = createQpdfBackend(await config())
    expect(backend).toBeDefined()

    const base = await generatePdf({ mode: "pages", pageCount: 1, text: "secured fixture" })
    const secured = await backend!.apply(base.bytes, DEFAULT_PDF_SECURITY.restrictions)

    expect(new TextDecoder().decode(secured)).toContain("/Encrypt")
    await expect(PDFDocument.load(secured)).rejects.toThrow()

    const decrypted = await backend!.decrypt(secured)
    const loaded = await PDFDocument.load(decrypted)
    expect(loaded.getPageCount()).toBe(1)
    expect(PDF_SECURITY_PASSWORDS.user).toBe("user-password")
  })

  it("generates a secured PDF through the public generator", async () => {
    const backend = createQpdfBackend(await config())
    const result = await generatePdf(
      {
        mode: "pages",
        pageCount: 2,
        text: "secured generation",
        security: { ...DEFAULT_PDF_SECURITY, enabled: true, restrictions: { ...DEFAULT_PDF_SECURITY.restrictions, printing: true } },
      },
      backend,
    )

    expect(result.pageCount).toBe(2)
    expect(new TextDecoder().decode(result.bytes)).toContain("/Encrypt")
    const decrypted = await backend!.decrypt(result.bytes)
    expect((await PDFDocument.load(decrypted)).getPageCount()).toBe(2)
  })

  it("reports the selected backend mode", async () => {
    const mode = qpdfMode(await config())
    expect(["wasm", "binary"]).toContain(mode)
  })
})
