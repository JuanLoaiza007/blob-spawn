import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { generatePdf } from "../lib/generators/pdf"
import { DEFAULT_PDF_SECURITY_RESTRICTIONS, PDF_SECURITY_PASSWORDS, getPdfSecurityArguments, type PdfSecurityRestrictions } from "../lib/generators/pdf-security"

const qpdfAvailable = (() => {
  try {
    execFileSync("qpdf", ["--version"], { stdio: "ignore" })
    return true
  } catch {
    console.warn("PDF security integration tests skipped: qpdf is not installed.")
    return false
  }
})()

const permissionCases = [
  ["Printing", "printing", -2056, "print low resolution: not allowed"],
  ["Changing the document", "changingDocument", -12, "modify other: not allowed"],
  ["Document assembly", "documentAssembly", -1028, "modify document assembly: not allowed"],
  ["Content copying or extraction", "contentCopying", -20, "extract for any purpose: not allowed"],
  ["Content extraction for accessibility", "accessibilityExtraction", -4, "extract for accessibility: allowed"],
  ["Page extraction", "pageExtraction", -1028, "modify document assembly: not allowed"],
  ["Commenting", "commenting", -36, "modify annotations: not allowed"],
  ["Filling of form fields", "formFilling", -260, "modify forms: not allowed"],
  ["Signing", "signing", -260, "modify forms: not allowed"],
  ["Creation of template pages", "templatePages", -1028, "modify document assembly: not allowed"],
] as const

type PermissionName = keyof PdfSecurityRestrictions

async function createBasePdf() {
  const result = await generatePdf({ mode: "pages", pageCount: 1, text: "PDF security integration fixture" })
  return {
    bytes: new Uint8Array(await result.blob.arrayBuffer()),
    mimeType: result.mimeType,
  }
}

function runQpdf(args: string[]) {
  return execFileSync("qpdf", args, { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 15_000 })
}

async function inspectRestrictions(restrictions: PdfSecurityRestrictions) {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-pdf-security-"))
  const inputPath = join(directory, "input.pdf")
  const outputPath = join(directory, "output.pdf")

  try {
    const base = await createBasePdf()
    await writeFile(inputPath, base.bytes)
    runQpdf([
      ...getPdfSecurityArguments(restrictions),
      "--",
      inputPath,
      outputPath,
    ])
    const report = runQpdf(["--password=" + PDF_SECURITY_PASSWORDS.owner, "--show-encryption", outputPath])
    const bytes = await readFile(outputPath)
    const decrypted = execFileSync("qpdf", [
      "--password=" + PDF_SECURITY_PASSWORDS.user,
      "--qdf",
      "--stream-data=uncompress",
      "--decrypt",
      outputPath,
      "-",
    ])
    const pageCount = runQpdf(["--password=" + PDF_SECURITY_PASSWORDS.user, "--show-npages", outputPath]).trim()
    return { report, bytes, decrypted, mimeType: base.mimeType, pageCount }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function createSecuredFixture(restrictions: PdfSecurityRestrictions) {
  const directory = await mkdtemp(join(tmpdir(), "blob-spawn-pdf-security-"))
  const inputPath = join(directory, "input.pdf")
  const outputPath = join(directory, "output.pdf")
  const base = await createBasePdf()
  await writeFile(inputPath, base.bytes)
  runQpdf([...getPdfSecurityArguments(restrictions), "--", inputPath, outputPath])
  return { directory, outputPath }
}

describe.skipIf(!qpdfAvailable)("PDF security integration with qpdf", () => {
  it.each(permissionCases)("applies the %s restriction", async (_label, name, expectedP, expectedPermission) => {
    const restrictions = { ...DEFAULT_PDF_SECURITY_RESTRICTIONS, [name as PermissionName]: true }
    const { report, bytes, decrypted, mimeType, pageCount } = await inspectRestrictions(restrictions)

    expect(report).toContain("R = 6")
    expect(report).toContain(`P = ${expectedP}`)
    expect(report).toContain("stream encryption method: AESv3")
    expect(report).toContain("string encryption method: AESv3")
    expect(report).toContain("file encryption method: AESv3")
    expect(report).toContain(expectedPermission)
    expect(bytes.slice(0, 5).toString()).toBe("%PDF-")
    expect(mimeType).toBe("application/pdf")
    expect(pageCount).toBe("1")
    expect(decrypted.toString("latin1")).toContain("BlobSpawn PDF test")
    expect(decrypted.toString("latin1")).toContain("https://blob-spawn.vercel.app")
  })

  it("produces the zero-permissions profile while accessibility remains allowed", async () => {
    const restrictions = Object.fromEntries(Object.keys(DEFAULT_PDF_SECURITY_RESTRICTIONS).map((name) => [name, true])) as PdfSecurityRestrictions
    const { report } = await inspectRestrictions(restrictions)

    expect(report).toContain("R = 6")
    expect(report).toContain("P = -3392")
    expect(report).toContain("extract for accessibility: allowed")
    expect(report).toContain("extract for any purpose: not allowed")
    expect(report).toContain("modify document assembly: not allowed")
    expect(report).toContain("modify forms: not allowed")
    expect(report).toContain("modify annotations: not allowed")
  })

  it("keeps all representable capabilities allowed when no restriction is selected", async () => {
    const { report } = await inspectRestrictions(DEFAULT_PDF_SECURITY_RESTRICTIONS)

    expect(report).toContain("R = 6")
    expect(report).toContain("P = -4")
    expect(report).toContain("print low resolution: allowed")
    expect(report).toContain("extract for any purpose: allowed")
    expect(report).toContain("modify document assembly: allowed")
  })

  it("opens with both configured passwords and rejects an incorrect password", async () => {
    const { directory, outputPath } = await createSecuredFixture(DEFAULT_PDF_SECURITY_RESTRICTIONS)
    try {
      expect(() => runQpdf(["--password=" + PDF_SECURITY_PASSWORDS.user, "--check", outputPath])).not.toThrow()
      expect(() => runQpdf(["--password=" + PDF_SECURITY_PASSWORDS.owner, "--check", outputPath])).not.toThrow()
      expect(() => runQpdf(["--password=incorrect-password", "--check", outputPath])).toThrow()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("rejects a corrupted secured PDF without affecting the temporary directory", async () => {
    const { directory, outputPath } = await createSecuredFixture(DEFAULT_PDF_SECURITY_RESTRICTIONS)
    const corruptedPath = join(directory, "corrupted.pdf")
    try {
      const bytes = await readFile(outputPath)
      await writeFile(corruptedPath, bytes.subarray(0, Math.max(1, Math.floor(bytes.length / 2))))
      expect(() => runQpdf(["--password=" + PDF_SECURITY_PASSWORDS.user, "--check", corruptedPath])).toThrow()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("keeps the unrestricted PDF free of an encryption dictionary", async () => {
    const base = await createBasePdf()
    expect(base.mimeType).toBe("application/pdf")
    expect(new TextDecoder().decode(base.bytes)).not.toContain("/Encrypt")
  })
})
