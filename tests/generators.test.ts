import { describe, expect, it } from "vitest"

import { FILE_TYPES, TEXT_FILE_TYPES, getFilename, searchFileTypes } from "../lib/generators/config"
import { generateTextFile } from "../lib/generators/text"
import { sizeToBytes, validateTargetSize } from "../lib/generators/validation"

const encoder = new TextDecoder()

async function readText(blob: Blob) {
  return encoder.decode(await blob.arrayBuffer())
}

describe("generator catalog", () => {
  it("resolves extensions, aliases and keeps a ranked order", () => {
    expect(searchFileTypes(".TXT")[0].type).toBe("txt")
    expect(searchFileTypes("Texto plano")[0].type).toBe("txt")
    expect(searchFileTypes("json")[0].type).toBe("json")
    expect(searchFileTypes("unsupported")).toHaveLength(0)
  })
})

describe("size validation", () => {
  it("converts decimal units and rejects invalid values", () => {
    expect(sizeToBytes("5", "MB")).toBe(5_000_000)
    expect(sizeToBytes("1.5", "MB")).toBeNull()
    expect(validateTargetSize("1", "KB")).toBeNull()
    expect(validateTargetSize("0", "KB")).not.toBeNull()
    expect(validateTargetSize("2049", "MB")).not.toBeNull()
  })
})

describe("filename generation", () => {
  it("keeps allowed Unicode characters and appends the selected extension", () => {
    expect(getFilename(FILE_TYPES[0], "prueba-á_01!")).toBe("prueba-á_01.txt")
    expect(getFilename(FILE_TYPES[1], "")).toBe("blob.json")
  })
})

describe("text file generation", () => {
  it.each(TEXT_FILE_TYPES)("generates an exact valid .$type file", async (fileType) => {
    const result = generateTextFile(
      {
        type: fileType.type,
        targetBytes: 1_000,
        jsonKey: "data",
        csvHeader: "data",
        contentSource: "lorem",
      },
      fileType,
    )

    expect(result.blob.size).toBe(1_000)
    expect(result.mimeType).toBe(fileType.mimeType)

    const text = await readText(result.blob)
    if (fileType.type === "json") {
      expect(JSON.parse(text)).toHaveProperty("data")
    }
    if (fileType.type === "csv") {
      const rows = text.trimEnd().split("\n")
      expect(rows[0]).toBe("data")
      expect(rows.every((row) => row.split(",").length === 1)).toBe(true)
    }
    if (fileType.type === "txt") {
      expect(text.length).toBeGreaterThan(0)
    }
  })
})
