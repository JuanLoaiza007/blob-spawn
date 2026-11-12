import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import type { ServerConfig } from "../src/config"
import { createTestClient, jsonOf, textOf } from "./helpers"

const directories: string[] = []

async function setup(overrides: Partial<ServerConfig> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-mcp-text-"))
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

describe("generate_text_file", () => {
  it.each(["txt", "json", "csv"] as const)("writes exact-size %s files with metadata", async (type) => {
    const { directory, client } = await setup()
    try {
      const result = await client.callTool("generate_text_file", {
        type,
        sizeBytes: 7_777,
        filename: "fixture",
        contentSource: "sequence",
      })
      expect(result.isError).toBeFalsy()
      const metadata = jsonOf<{ path: string; bytes: number; sha256: string }>(result)
      expect(metadata.bytes).toBe(7_777)
      expect((await stat(metadata.path)).size).toBe(7_777)

      const bytes = await readFile(join(directory, `fixture.${type}`))
      expect(bytes.length).toBe(7_777)
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(metadata.sha256)

      const text = bytes.toString("utf8")
      if (type === "json") expect(JSON.parse(text)).toHaveProperty("data")
      if (type === "csv") expect(text.split("\n")[0]).toBe("data")
    } finally {
      await client.close()
    }
  })

  it("refuses to overwrite unless requested", async () => {
    const { directory, client } = await setup()
    try {
      await writeFile(join(directory, "exists.txt"), "original")

      const refused = await client.callTool("generate_text_file", {
        type: "txt",
        sizeBytes: 1_000,
        filename: "exists",
      })
      expect(refused.isError).toBe(true)
      expect(textOf(refused)).toContain("OUTPUT_EXISTS")
      expect(await readFile(join(directory, "exists.txt"), "utf8")).toBe("original")

      const replaced = await client.callTool("generate_text_file", {
        type: "txt",
        sizeBytes: 1_000,
        filename: "exists",
        overwrite: true,
      })
      expect(replaced.isError).toBeFalsy()
      expect((await stat(join(directory, "exists.txt"))).size).toBe(1_000)
    } finally {
      await client.close()
    }
  })

  it("creates nested subdirectories and rejects traversal", async () => {
    const { client } = await setup()
    try {
      const nested = await client.callTool("generate_text_file", {
        type: "txt",
        sizeBytes: 1_000,
        filename: "nested",
        subdir: "reports/2026",
      })
      expect(nested.isError).toBeFalsy()

      const escaped = await client.callTool("generate_text_file", {
        type: "txt",
        sizeBytes: 1_000,
        subdir: "../escape",
      })
      expect(escaped.isError).toBe(true)
      expect(textOf(escaped)).toContain("OUTPUT_OUTSIDE_ROOT")
    } finally {
      await client.close()
    }
  })

  it("rejects invalid schemas without creating files", async () => {
    const { directory, client } = await setup()
    try {
      const result = await client.callTool("generate_text_file", { type: "txt", sizeBytes: 10 })
      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain("Too small")
      expect(await readdir(directory)).toEqual([])
    } finally {
      await client.close()
    }
  })
})
