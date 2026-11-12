import type { McpServer } from "@modelcontextprotocol/server"

import type { ServerConfig } from "../config"
import { FILE_TYPES, GENERATOR_LIMITS, PDF_SECURITY_PASSWORDS, DEFAULT_PDF_SECURITY_RESTRICTIONS } from "../core"
import { isSecurityAvailable, qpdfMode } from "../qpdf"
import { jsonResult } from "./result"

export function registerListFileTypes(server: McpServer, config: ServerConfig) {
  server.registerTool(
    "list_file_types",
    {
      title: "List BlobSpawn generators",
      description: "List supported file types, fields, defaults, limits, output configuration, and PDF security availability.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      return jsonResult({
        outputDirectory: config.outputDir ?? null,
        outputConfigured: Boolean(config.outputDir),
        limits: {
          minBytes: GENERATOR_LIMITS.minBytes,
          maxTextBytes: config.maxTextBytes,
          maxPdfBytes: config.maxPdfBytes,
          maxApplicationBytes: GENERATOR_LIMITS.maxApplicationBytes,
          pdfMaxPages: GENERATOR_LIMITS.pdfMaxPages,
          pdfMaxTextCharacters: GENERATOR_LIMITS.pdfMaxTextCharacters,
          pdfMaxTextBytes: GENERATOR_LIMITS.pdfMaxTextBytes,
        },
        security: {
          available: isSecurityAvailable(config),
          mode: qpdfMode(config),
          passwords: PDF_SECURITY_PASSWORDS,
          restrictions: Object.keys(DEFAULT_PDF_SECURITY_RESTRICTIONS),
        },
        types: FILE_TYPES.map((fileType) => ({
          type: fileType.type,
          extension: fileType.extension,
          mimeType: fileType.mimeType,
          displayName: fileType.displayName,
          aliases: fileType.aliases,
          fields: fileType.fields,
          defaults: fileType.defaults,
        })),
        configurationHint: config.outputDir
          ? undefined
          : "Set BLOB_SPAWN_OUTPUT_DIR or pass --output-dir <absolute-path> to enable generation.",
      })
    },
  )
}
