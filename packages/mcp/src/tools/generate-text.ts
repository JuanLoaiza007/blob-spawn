import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"

import type { ServerConfig } from "../config"
import { FILE_TYPES, GENERATOR_LIMITS, textChunks, type FileType } from "../core"
import { McpToolError } from "../errors"
import { resolveOutput } from "../fs/guard"
import { writeOutput } from "../fs/output"
import { TOOL_ANNOTATIONS, jsonResult, toolError } from "./result"

const textTypes = ["txt", "json", "csv"] as const

export function registerGenerateTextFile(server: McpServer, config: ServerConfig) {
  server.registerTool(
    "generate_text_file",
    {
      title: "Generate a text test file",
      description: "Generate an exact-size TXT, JSON, or CSV test file inside the configured output directory.",
      inputSchema: z.object({
        type: z.enum(textTypes),
        sizeBytes: z.number().int().min(GENERATOR_LIMITS.minBytes).max(config.maxTextBytes),
        filename: z.string().min(1).max(80).optional(),
        subdir: z.string().max(200).optional(),
        overwrite: z.boolean().optional(),
        contentSource: z.enum(["lorem", "sequence"]).optional(),
        jsonKey: z.string().max(80).optional(),
        csvHeader: z.string().max(80).optional(),
      }),
      annotations: TOOL_ANNOTATIONS,
    },
    async (input) => {
      try {
        const fileType = FILE_TYPES.find((candidate) => candidate.type === input.type)
        if (!fileType) throw new McpToolError("INVALID_FILE_TYPE", `Unsupported type: ${input.type}`)
        if (input.sizeBytes > config.maxTextBytes) {
          throw new McpToolError("OUTPUT_TOO_LARGE", `sizeBytes exceeds the configured maximum of ${config.maxTextBytes}`)
        }

        const destination = await resolveOutput(config, {
          filename: input.filename,
          extension: fileType.extension,
          subdir: input.subdir,
          overwrite: input.overwrite,
        })

        const chunks = textChunks({
          type: input.type as FileType,
          targetBytes: input.sizeBytes,
          contentSource: input.contentSource,
          jsonKey: input.jsonKey,
          csvHeader: input.csvHeader,
        })

        const written = await writeOutput(destination.path, chunks, input.overwrite ?? config.allowOverwrite)
        const metadata = {
          path: written.path,
          filename: destination.filename,
          bytes: written.bytes,
          sha256: written.sha256,
          mimeType: fileType.mimeType,
          extension: fileType.extension,
          type: input.type,
        }
        return jsonResult(metadata, { path: written.path, mimeType: fileType.mimeType })
      } catch (error) {
        return toolError(error)
      }
    },
  )
}
