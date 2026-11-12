import { serveStdio } from "@modelcontextprotocol/server/stdio"

import { parseConfig } from "./config"
import { SERVER_NAME, SERVER_VERSION } from "./version"
import { createServer } from "./server"

const HELP = `blob-spawn-mcp ${SERVER_VERSION}

Usage: blob-spawn-mcp [options]

Options:
  --output-dir <path>       Directory where generated files are written (required)
  --max-text-bytes <n>     Maximum text file size (default: 2000000000)
  --max-pdf-bytes <n>      Maximum PDF size (default: 104857600)
  --allow-overwrite        Replace existing files by default
  --qpdf <path>            Path to a qpdf binary for PDF encryption fallback
  --debug                  Write diagnostics to stderr
  --version                Print the version and exit
  --help                   Print this help and exit

Environment:
  BLOB_SPAWN_OUTPUT_DIR, BLOB_SPAWN_MAX_TEXT_BYTES, BLOB_SPAWN_MAX_PDF_BYTES,
  BLOB_SPAWN_ALLOW_OVERWRITE, BLOB_SPAWN_QPDF, BLOB_SPAWN_DEBUG

The server uses stdout exclusively for MCP protocol messages. All diagnostics go to stderr.`

async function main() {
  const argv = process.argv.slice(2)

  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${HELP}\n`)
    return
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    process.stdout.write(`${SERVER_VERSION}\n`)
    return
  }

  const config = parseConfig(argv)
  const handle = serveStdio(() => createServer(config), {
    onerror: (error) => console.error(`[${SERVER_NAME}] ${error.message}`),
  })

  const shutdown = () => {
    void handle.close().finally(() => process.exit(0))
  }
  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
