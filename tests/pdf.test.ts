import { describe, expect, it } from "vitest"
import { PDFArray, PDFDocument, PDFStream } from "pdf-lib"

import { createPdfTestImage } from "../lib/generators/pdf-image"
import { PDF_SOURCE_URL, estimatePdf, generatePdf } from "../lib/generators/pdf"
import { DEFAULT_PDF_SECURITY, getPdfSecurityArguments, type PdfSecurityRestrictions } from "../lib/generators/pdf-security"
import { validatePdfPageCount, validatePdfText } from "../lib/generators/validation"

async function bytesOf(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer())
}

describe("PDF generator", () => {
  it("creates a raster image fixture", () => {
    const image = createPdfTestImage()
    expect(image.slice(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(image.length).toBeGreaterThan(100)
  })

  it("creates the requested number of pages with image and literal-safe content", async () => {
    const result = await generatePdf({ mode: "pages", pageCount: 3, text: "Texto á <script>alert(1)</script>" })
    const bytes = await bytesOf(result.blob)
    const loaded = await PDFDocument.load(bytes)
    const source = new TextDecoder().decode(bytes)

    expect(result.blob.type).toBe("application/pdf")
    expect(loaded.getPageCount()).toBe(3)
    expect(source).toContain("/Subtype /Image")
    expect(source).not.toContain("/JavaScript")
    expect(source).toContain("/URI")
    expect(source).toContain(PDF_SOURCE_URL)
    for (const page of loaded.getPages()) {
      const contents = page.node.Contents()
      const stream = contents instanceof PDFArray
        ? loaded.context.lookup(contents.get(0), PDFStream)
        : contents
      const streamLike = stream as unknown as { getUnencodedContents?: () => Uint8Array; getContents?: () => Uint8Array } | undefined
      const content = streamLike?.getUnencodedContents
        ? streamLike.getUnencodedContents()
        : streamLike?.getContents
          ? streamLike.getContents()
          : new Uint8Array()
      expect(content.length).toBeGreaterThan(0)
    }
  })

  it("reaches exact final sizes while remaining readable", async () => {
    for (const targetBytes of [10_000, 50_000]) {
      const result = await generatePdf({ mode: "size", targetBytes, text: "Texto de prueba" })
      const bytes = await bytesOf(result.blob)
      const loaded = await PDFDocument.load(bytes)
      expect(bytes.length).toBe(targetBytes)
      expect(loaded.getPageCount()).toBeGreaterThan(0)
      expect(new TextDecoder().decode(bytes)).toContain("/Subtype /Image")
    }
  })

  it("estimates page and size modes", async () => {
    const pages = await estimatePdf({ mode: "pages", pageCount: 4, text: "demo" })
    const size = await estimatePdf({ mode: "size", targetBytes: 20_000, text: "demo" })
    expect(pages.pageCount).toBe(4)
    expect(pages.estimatedBytes).toBeGreaterThan(0)
    expect(size.pageCount).toBeGreaterThan(0)
    expect(size.estimatedBytes).toBe(20_000)
  })

  it("keeps disabled security compatible with the unrestricted document", async () => {
    const result = await generatePdf({ mode: "pages", pageCount: 1, text: "demo", security: DEFAULT_PDF_SECURITY })
    const source = new TextDecoder().decode(await bytesOf(result.blob))
    expect(source).not.toContain("/Encrypt")
  })

  it("rejects a target smaller than the structural PDF", async () => {
    await expect(generatePdf({ mode: "size", targetBytes: 1_000, text: "demo" })).rejects.toThrow("demasiado pequeño")
  })
})

describe("PDF validation", () => {
  it("rejects invalid pages and excessive text", () => {
    expect(validatePdfPageCount("0")).not.toBeNull()
    expect(validatePdfPageCount("1.5")).not.toBeNull()
    expect(validatePdfPageCount("1001")).not.toBeNull()
    expect(validatePdfText("x".repeat(501))).not.toBeNull()
    expect(validatePdfText("<script>alert(1)</script>")).toBeNull()
  })
})

describe("PDF security configuration", () => {
  it("starts with security disabled and no active restrictions", () => {
    expect(DEFAULT_PDF_SECURITY.enabled).toBe(false)
    expect(Object.values(DEFAULT_PDF_SECURITY.restrictions).every((value) => !value)).toBe(true)
    expect(getPdfSecurityArguments(DEFAULT_PDF_SECURITY.restrictions)).toEqual([
      "--encrypt",
      "user-password",
      "owner-password",
      "256",
    ])
  })

  it("maps active restrictions to qpdf arguments without duplicating grouped capabilities", () => {
    const restrictions: PdfSecurityRestrictions = {
      ...DEFAULT_PDF_SECURITY.restrictions,
      documentAssembly: true,
      pageExtraction: true,
      signing: true,
      templatePages: true,
      commenting: true,
    }

    expect(getPdfSecurityArguments(restrictions)).toEqual([
      "--encrypt",
      "user-password",
      "owner-password",
      "256",
      "--assemble=n",
      "--annotate=n",
      "--form=n",
    ])
  })

  it("rejects exact-size mode when security is enabled", async () => {
    await expect(generatePdf({
      mode: "size",
      targetBytes: 10_000,
      text: "demo",
      security: { ...DEFAULT_PDF_SECURITY, enabled: true },
    })).rejects.toThrow("tamaño exacto")
  })
})
