import { McpServer } from "@modelcontextprotocol/server"

import type { ServerConfig } from "./config"
import { SERVER_NAME, SERVER_VERSION } from "./version"
import { registerGenerateTextFile } from "./tools/generate-text"
import { registerListFileTypes } from "./tools/list-types"
import { registerEstimatePdf, registerGeneratePdfFile } from "./tools/pdf"

export function createServer(config: ServerConfig) {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  registerListFileTypes(server, config)
  registerGenerateTextFile(server, config)
  registerEstimatePdf(server, config)
  registerGeneratePdfFile(server, config)

  return server
}
