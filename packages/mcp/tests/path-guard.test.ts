import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import type { ServerConfig } from "../src/config"
import { resolveOutput } from "../src/fs/guard"

const directories: string[] = []

async function root() {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-mcp-guard-"))
  directories.push(directory)
  return directory
}

function config(directory: string): ServerConfig {
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

describe("output path guard", () => {
  it("resolves a safe destination inside the root", async () => {
    const directory = await root()
    const resolved = await resolveOutput(config(directory), {
      filename: "prueba-á_01",
      extension: ".txt",
      subdir: "reports",
    })
    expect(resolved.filename).toBe("prueba-á_01.txt")
    expect(resolved.path.startsWith(directory)).toBe(true)
  })

  it.each(["../escape", "a/../../escape", "/absolute", "C:\\absolute"])(
    "rejects traversal or absolute subdirectories: %s",
    async (subdir) => {
      const directory = await root()
      await expect(resolveOutput(config(directory), { filename: "x", extension: ".txt", subdir })).rejects.toMatchObject({ code: "OUTPUT_OUTSIDE_ROOT" })
    },
  )

  it.each(["CON", "PRN", "LPT1", "com9"])("rejects Windows-reserved names: %s", async (filename) => {
    const directory = await root()
    await expect(resolveOutput(config(directory), { filename, extension: ".txt" })).rejects.toThrow()
  })

  it("normalizes trailing dots and spaces instead of writing them", async () => {
    const directory = await root()
    const resolved = await resolveOutput(config(directory), { filename: "name. ", extension: ".txt" })
    expect(resolved.filename).toBe("name.txt")
  })

  it("rejects a symlink that escapes the root", async () => {
    if (process.platform === "win32") return
    const directory = await root()
    const outside = await root()
    await mkdir(join(outside, "target"), { recursive: true })
    await symlink(join(outside, "target"), join(directory, "link"), "dir")

    await expect(
      resolveOutput(config(directory), { filename: "x", extension: ".txt", subdir: "link" }),
    ).rejects.toMatchObject({ code: "OUTPUT_OUTSIDE_ROOT" })
  })

  it("detects an existing destination unless overwrite is requested", async () => {
    const directory = await root()
    await writeFile(join(directory, "taken.txt"), "x")
    await expect(resolveOutput(config(directory), { filename: "taken", extension: ".txt" })).rejects.toMatchObject({ code: "OUTPUT_EXISTS" })
    await expect(
      resolveOutput(config(directory), { filename: "taken", extension: ".txt", overwrite: true }),
    ).resolves.toMatchObject({ filename: "taken.txt" })
  })
})
