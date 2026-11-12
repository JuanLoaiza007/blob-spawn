import { pathToFileURL } from "node:url"

import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/server"

import { McpToolError, errorMessage } from "../errors"

export const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
}

export function jsonResult(value: unknown, file?: { path: string; mimeType: string }): CallToolResult {
  const content: CallToolResult["content"] = [{ type: "text", text: JSON.stringify(value, null, 2) }]
  if (file) {
    content.push({
      type: "resource_link",
      uri: pathToFileURL(file.path).href,
      name: file.path.split(/[\\/]/).pop() ?? file.path,
      mimeType: file.mimeType,
    })
  }
  return { content }
}

export function toolError(error: unknown): CallToolResult {
  const code = error instanceof McpToolError ? error.code : "GENERATION_FAILED"
  return {
    isError: true,
    content: [{ type: "text", text: `${code}: ${errorMessage(error)}` }],
  }
}
