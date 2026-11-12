import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"

import type { ServerConfig } from "../config"
import {
  DEFAULT_PDF_SECURITY,
  DEFAULT_PDF_SECURITY_RESTRICTIONS,
  GENERATOR_LIMITS,
  estimatePdf,
  generatePdf,
  normalizePdfText,
  validatePdfPageCount,
  validatePdfText,
  type PdfOptions,
  type PdfSecurityRestrictions,
} from "../core"
import { McpToolError } from "../errors"
import { resolveOutput } from "../fs/guard"
import { writeOutput } from "../fs/output"
import { createQpdfBackend, isSecurityAvailable } from "../qpdf"
import { TOOL_ANNOTATIONS, jsonResult, toolError } from "./result"

const restrictionsSchema = z.object({
  printing: z.boolean().default(false),
  changingDocument: z.boolean().default(false),
  documentAssembly: z.boolean().default(false),
  contentCopying: z.boolean().default(false),
  accessibilityExtraction: z.boolean().default(false),
  pageExtraction: z.boolean().default(false),
  commenting: z.boolean().default(false),
  formFilling: z.boolean().default(false),
  signing: z.boolean().default(false),
  templatePages: z.boolean().default(false),
})

const securitySchema = z
  .object({
    enabled: z.boolean().default(false),
    restrictions: restrictionsSchema.default(DEFAULT_PDF_SECURITY_RESTRICTIONS),
  })
  .default(DEFAULT_PDF_SECURITY)

function basePdfSchema(config: ServerConfig) {
  return z.object({
    mode: z.enum(["pages", "size"]),
    pageCount: z.number().int().min(1).max(GENERATOR_LIMITS.pdfMaxPages).optional(),
    targetBytes: z.number().int().min(GENERATOR_LIMITS.minBytes).max(config.maxPdfBytes).optional(),
    text: z.string().max(2_000).default("BlobSpawn PDF test"),
    security: securitySchema,
  })
}

type PdfInput = {
  mode: "pages" | "size"
  pageCount?: number
  targetBytes?: number
  text: string
  security: { enabled: boolean; restrictions: PdfSecurityRestrictions }
}

function buildOptions(input: PdfInput, config: ServerConfig): PdfOptions {
  const text = normalizePdfText(input.text)
  const textError = validatePdfText(text)
  if (textError) throw new McpToolError(textError, "PDF text violates the configured limits")

  if (input.mode === "pages") {
    if (input.pageCount === undefined) {
      throw new McpToolError("PAGE_POSITIVE", "pageCount is required when mode is pages")
    }
    const pageError = validatePdfPageCount(String(input.pageCount))
    if (pageError) throw new McpToolError(pageError, "pageCount is outside the supported range")
    return { mode: "pages", pageCount: input.pageCount, text, security: input.security }
  }

  if (input.targetBytes === undefined) {
    throw new McpToolError("SIZE_POSITIVE", "targetBytes is required when mode is size")
  }
  if (input.targetBytes > config.maxPdfBytes) {
    throw new McpToolError("OUTPUT_TOO_LARGE", `targetBytes exceeds the configured maximum of ${config.maxPdfBytes}`)
  }
  if (input.security.enabled) {
    throw new McpToolError(
      "SECURITY_SIZE_INCOMPATIBLE",
      "Exact final size cannot be combined with PDF security",
      "Use page-count mode for secured PDFs.",
    )
  }
  return { mode: "size", targetBytes: input.targetBytes, text, security: input.security }
}

function securityBackend(config: ServerConfig, options: PdfOptions) {
  if (!options.security?.enabled) return undefined
  if (!isSecurityAvailable(config)) {
    throw new McpToolError(
      "PDF_SECURITY_UNAVAILABLE",
      "PDF encryption backend is not available",
      "Install qpdf in PATH or launch the server with --qpdf <path>. Generation without security still works.",
    )
  }
  const backend = createQpdfBackend(config)
  if (!backend) {
    throw new McpToolError("PDF_SECURITY_UNAVAILABLE", "PDF encryption backend could not be initialized")
  }
  return backend
}

export function registerEstimatePdf(server: McpServer, config: ServerConfig) {
  server.registerTool(
    "estimate_pdf",
    {
      title: "Estimate a PDF fixture",
      description: "Estimate the page count and byte size of a PDF without writing a file.",
      inputSchema: basePdfSchema(config),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      try {
        const options = buildOptions(input as PdfInput, config)
        const estimate = await estimatePdf(options)
        return jsonResult({
          estimatedBytes: estimate.estimatedBytes,
          pageCount: estimate.pageCount,
          mode: options.mode,
          securityAvailable: isSecurityAvailable(config),
        })
      } catch (error) {
        return toolError(error)
      }
    },
  )
}

export function registerGeneratePdfFile(server: McpServer, config: ServerConfig) {
  server.registerTool(
    "generate_pdf_file",
    {
      title: "Generate a PDF test file",
      description: "Generate an exact-size or exact-page PDF fixture inside the configured output directory.",
      inputSchema: basePdfSchema(config).extend({
        filename: z.string().min(1).max(80).optional(),
        subdir: z.string().max(200).optional(),
        overwrite: z.boolean().optional(),
      }),
      annotations: TOOL_ANNOTATIONS,
    },
    async (input) => {
      try {
        const options = buildOptions(input as PdfInput, config)
        const backend = securityBackend(config, options)

        const destination = await resolveOutput(config, {
          filename: input.filename,
          extension: ".pdf",
          subdir: input.subdir,
          overwrite: input.overwrite,
        })

        const result = await generatePdf(options, backend)
        const written = await writeOutput(
          destination.path,
          [result.bytes],
          input.overwrite ?? config.allowOverwrite,
        )

        const metadata = {
          path: written.path,
          filename: destination.filename,
          bytes: written.bytes,
          sha256: written.sha256,
          mimeType: result.mimeType,
          extension: result.extension,
          pageCount: result.pageCount,
          mode: options.mode,
          securityEnabled: Boolean(options.security?.enabled),
        }
        return jsonResult(metadata, { path: written.path, mimeType: result.mimeType })
      } catch (error) {
        return toolError(error)
      }
    },
  )
}

export const PDF_RESTRICTION_NAMES = Object.keys(DEFAULT_PDF_SECURITY_RESTRICTIONS)
