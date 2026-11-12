import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline"

import { afterEach, describe, expect, it } from "vitest"

import type { ServerConfig } from "../src/config"
import { createTestClient, jsonOf, textOf } from "./helpers"

const directories: string[] = []

async function testConfig(overrides: Partial<ServerConfig> = {}): Promise<ServerConfig> {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-mcp-test-"))
  directories.push(directory)
  return {
    outputDir: directory,
    maxTextBytes: 10_000_000,
    maxPdfBytes: 5_000_000,
    allowOverwrite: false,
    debug: false,
    ...overrides,
  }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("MCP protocol", () => {
  it("lists the four generation tools", async () => {
    const client = await createTestClient(await testConfig())
    try {
      const result = (await client.request("tools/list", {})) as { tools: { name: string }[] }
      expect(result.tools.map((tool) => tool.name).sort()).toEqual([
        "estimate_pdf",
        "generate_pdf_file",
        "generate_text_file",
        "list_file_types",
      ])
    } finally {
      await client.close()
    }
  })

  it("reports a missing output directory without blocking discovery", async () => {
    const client = await createTestClient(await testConfig({ outputDir: undefined }))
    try {
      const listed = jsonOf<{ outputConfigured: boolean }>(await client.callTool("list_file_types", {}))
      expect(listed.outputConfigured).toBe(false)

      const generated = await client.callTool("generate_text_file", { type: "txt", sizeBytes: 1_000 })
      expect(generated.isError).toBe(true)
      expect(textOf(generated)).toContain("OUTPUT_DIR_NOT_CONFIGURED")
    } finally {
      await client.close()
    }
  })

  it("keeps stdout limited to JSON-RPC when spawned as a real process", async () => {
    const config = await testConfig()
    const child = spawn(process.execPath, [join(process.cwd(), "dist", "index.js")], {
      env: { ...process.env, BLOB_SPAWN_OUTPUT_DIR: config.outputDir },
      stdio: ["pipe", "pipe", "pipe"],
    })

    try {
      const lines: string[] = []
      const errors: string[] = []
      createInterface({ input: child.stdout }).on("line", (line) => lines.push(line))
      createInterface({ input: child.stderr }).on("line", (line) => errors.push(line))

      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "stdio-test", version: "1.0.0" },
          },
        })}\n`,
      )
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`)
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`)

      await waitFor(() => lines.length >= 2, 10_000)
      for (const line of lines) {
        const message = JSON.parse(line) as { jsonrpc?: string }
        expect(message.jsonrpc).toBe("2.0")
      }
      expect(errors.join("\n")).not.toContain("not implemented")
    } finally {
      child.kill("SIGTERM")
    }
  })
})

async function waitFor(condition: () => boolean, timeoutMs: number) {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for condition")
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}
