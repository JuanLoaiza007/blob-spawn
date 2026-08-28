import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib"

import { GENERATOR_LIMITS, SIZE_UNITS } from "./config"
import { createPdfTestImage } from "./pdf-image"
import { AppError } from "./errors"
import { applyPdfSecurity, decryptPdfForVerification, type PdfSecurityOptions } from "./pdf-security"
import { normalizePdfText, validatePdfPageCount, validatePdfText } from "./validation"

export type PdfOptions =
  | { mode: "pages"; pageCount: number; text: string; security?: PdfSecurityOptions }
  | { mode: "size"; targetBytes: number; text: string; security?: PdfSecurityOptions }

export type PdfResult = {
  blob: Blob
  extension: ".pdf"
  mimeType: "application/pdf"
  pageCount: number
  estimatedBytes: number
}

const A4: [number, number] = [595.28, 841.89]
export const PDF_SOURCE_URL = "https://blob-spawn.vercel.app"

function addSourceLink(pdf: PDFDocument, page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const size = 8
  const width = font.widthOfTextAtSize("blob-spawn.vercel.app", size)
  const x = A4[0] - 36 - width
  const y = 14
  page.drawText("blob-spawn.vercel.app", { x, y, size, font, color: rgb(0.18, 0.35, 0.72) })
  page.drawLine({ start: { x, y: y - 2 }, end: { x: x + width, y: y - 2 }, thickness: 0.5, color: rgb(0.18, 0.35, 0.72) })

  const annotation = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y - 2, x + width, y + size + 2],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(PDF_SOURCE_URL) },
  })
  page.node.set(PDFName.of("Annots"), pdf.context.obj([annotation]))
}

function ensureText(text: string) {
  const normalized = normalizePdfText(text)
  const error = validatePdfText(normalized)
  if (error) throw new AppError(error)
  return normalized
}

async function serialize(pageCount: number, text: string, paddingBytes = 0) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const image = await pdf.embedPng(createPdfTestImage())
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage(A4)
    page.drawRectangle({ x: 36, y: 36, width: A4[0] - 72, height: A4[1] - 72, borderColor: rgb(0.85, 0.85, 0.9), borderWidth: 1 })
    page.drawImage(image, { x: 52, y: A4[1] - 160, width: 96, height: 96 })
    page.drawText("BlobSpawn PDF test", { x: 170, y: A4[1] - 90, size: 18, font, color: rgb(0.25, 0.12, 0.4) })
    page.drawText(text, { x: 52, y: A4[1] - 205, size: 12, font, maxWidth: A4[0] - 104, lineHeight: 18 })
    page.drawText(`Página ${index + 1} de ${pageCount}`, { x: 52, y: 52, size: 9, font, color: rgb(0.35, 0.35, 0.4) })
    addSourceLink(pdf, page, font)
  }

  if (paddingBytes > 0) {
    const context = (pdf as unknown as { context: { stream: (contents: Uint8Array, dict: Record<string, string>) => unknown; register: (object: unknown) => unknown } }).context
    context.register(context.stream(new Uint8Array(paddingBytes), { Type: "/EmbeddedFile", Subtype: "/application#2Foctet-stream" }))
  }

  return pdf.save({ useObjectStreams: false })
}

async function exactSize(pageCount: number, text: string, targetBytes: number) {
  const base = await serialize(pageCount, text)
  if (base.length > targetBytes) throw new AppError("PDF_TOO_SMALL")
  if (base.length === targetBytes) return base

  let padding = targetBytes - base.length
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const bytes = await serialize(pageCount, text, padding)
    if (bytes.length === targetBytes) return bytes
    padding += targetBytes - bytes.length
    if (padding < 0) throw new AppError("PDF_CANT_ADJUST")
  }
  throw new AppError("PDF_CANT_PRODUCE")
}

async function estimateOnePage(text: string) {
  return (await serialize(1, text)).length
}

export async function estimatePdf(options: PdfOptions) {
  const text = ensureText(options.text)
  const onePage = await estimateOnePage(text)
  const securityOverhead = options.security?.enabled ? 2_000 : 0
  if (options.mode === "pages") return { estimatedBytes: onePage * options.pageCount + securityOverhead, pageCount: options.pageCount }
  return { estimatedBytes: options.targetBytes, pageCount: Math.max(1, Math.min(GENERATOR_LIMITS.pdfMaxPages, Math.floor(options.targetBytes / onePage))) }
}

export async function generatePdf(options: PdfOptions): Promise<PdfResult> {
  const text = ensureText(options.text)
  if (options.security?.enabled && options.mode === "size") {
    throw new AppError("SECURITY_SIZE_INCOMPATIBLE")
  }
  if (options.mode === "pages") {
    const pageError = validatePdfPageCount(String(options.pageCount))
    if (pageError) throw new AppError(pageError)
  }
  if (options.mode === "size" && (!Number.isSafeInteger(options.targetBytes) || options.targetBytes <= 0 || options.targetBytes > GENERATOR_LIMITS.maxApplicationBytes)) {
    throw new AppError("PDF_INVALID_TARGET")
  }

  let pageCount = options.mode === "pages" ? options.pageCount : (await estimatePdf(options)).pageCount
  let bytes: Uint8Array
  if (options.mode === "pages") {
    bytes = await serialize(pageCount, text)
    if (options.security?.enabled) bytes = await applyPdfSecurity(bytes, options.security.restrictions)
  } else {
    while (pageCount > 1) {
      const base = await serialize(pageCount, text)
      if (base.length <= options.targetBytes) break
      pageCount -= 1
    }
    bytes = await exactSize(pageCount, text, options.targetBytes)
  }

  const source = new TextDecoder().decode(bytes)
  const verificationBytes = options.security?.enabled ? await decryptPdfForVerification(bytes) : bytes
  const verificationSource = new TextDecoder().decode(verificationBytes)
  const loaded = await PDFDocument.load(verificationBytes)
  if (
    !source.startsWith("%PDF-") ||
    loaded.getPageCount() !== pageCount ||
    !verificationSource.includes("/Subtype /Image") ||
    !verificationSource.includes(PDF_SOURCE_URL) ||
    (options.security?.enabled && !source.includes("/Encrypt"))
  ) {
    throw new AppError("PDF_VERIFICATION_FAILED")
  }
  if (options.mode === "size" && bytes.length !== options.targetBytes) throw new AppError("PDF_SIZE_MISMATCH")
  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    extension: ".pdf",
    mimeType: "application/pdf",
    pageCount,
    estimatedBytes: options.mode === "size" ? options.targetBytes : await estimateOnePage(text) * pageCount,
  }
}

export function pdfSizeToBytes(size: string, unit: keyof typeof SIZE_UNITS) {
  const value = Number(size)
  return Number.isInteger(value) && value > 0 ? value * SIZE_UNITS[unit] : null
}