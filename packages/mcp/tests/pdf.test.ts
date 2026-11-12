import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { PDFDocument } from "pdf-lib"
import { afterEach, describe, expect, it } from "vitest"

import type { ServerConfig } from "../src/config"
import { PDF_SOURCE_URL } from "../src/core"
import { createTestClient, jsonOf, textOf } from "./helpers"

const directories: string[] = []

async function setup(overrides: Partial<ServerConfig> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-mcp-pdf-"))
  directories.push(directory)
  const config: ServerConfig = {
    outputDir: directory,
    maxTextBytes: 10_000_000,
    maxPdfBytes: 5_000_000,
    allowOverwrite: false,
    debug: false,
    ...overrides,
  }
  return { directory, config, client: await createTestClient(config) }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("PDF tools", () => {
  it("estimates page and exact-size modes", async () => {
    const { client } = await setup()
    try {
      const pages = jsonOf<{ pageCount: number; estimatedBytes: number }>(
        await client.callTool("estimate_pdf", { mode: "pages", pageCount: 4, text: "demo" }),
      )
      expect(pages.pageCount).toBe(4)
      expect(pages.estimatedBytes).toBeGreaterThan(0)

      const size = jsonOf<{ pageCount: number; estimatedBytes: number }>(
        await client.callTool("estimate_pdf", { mode: "size", targetBytes: 20_000, text: "demo" }),
      )
      expect(size.pageCount).toBeGreaterThan(0)
      expect(size.estimatedBytes).toBe(20_000)
    } finally {
      await client.close()
    }
  })

  it("writes a readable multi-page PDF with the fixed source link", async () => {
    const { directory, client } = await setup()
    try {
      const result = await client.callTool("generate_pdf_file", {
        mode: "pages",
        pageCount: 3,
        text: "Texto á <script>alert(1)</script>",
        filename: "pages",
      })
      expect(result.isError).toBeFalsy()
      const metadata = jsonOf<{ path: string; bytes: number; pageCount: number }>(result)
      expect(metadata.pageCount).toBe(3)

      const bytes = await readFile(join(directory, "pages.pdf"))
      expect((await stat(metadata.path)).size).toBe(bytes.length)
      const loaded = await PDFDocument.load(bytes)
      expect(loaded.getPageCount()).toBe(3)
      const source = bytes.toString("latin1")
      expect(source).toContain("/Subtype /Image")
      expect(source).toContain(PDF_SOURCE_URL)
      expect(source).not.toContain("/JavaScript")
    } finally {
      await client.close()
    }
  })

  it("produces an exact final size", async () => {
    const { client } = await setup()
    try {
      const result = await client.callTool("generate_pdf_file", {
        mode: "size",
        targetBytes: 30_000,
        text: "exact",
        filename: "exact",
      })
      expect(result.isError).toBeFalsy()
      const metadata = jsonOf<{ path: string; bytes: number }>(result)
      expect(metadata.bytes).toBe(30_000)
      const loaded = await PDFDocument.load(await readFile(metadata.path))
      expect(loaded.getPageCount()).toBeGreaterThan(0)
    } finally {
      await client.close()
    }
  })

  it("rejects security combined with exact size before writing", async () => {
    const { directory, client } = await setup()
    try {
      const result = await client.callTool("generate_pdf_file", {
        mode: "size",
        targetBytes: 30_000,
        security: { enabled: true },
      })
      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain("SECURITY_SIZE_INCOMPATIBLE")
      expect(await readdir(directory)).toEqual([])
    } finally {
      await client.close()
    }
  })
})
