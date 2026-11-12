export const MCP_VERSION = "0.1.0"
export const MCP_TAG = `mcp-v${MCP_VERSION}`
export const MCP_ASSET = `blob-spawn-mcp-${MCP_VERSION}.tgz`
export const MCP_RELEASE_URL = `https://github.com/JuanLoaiza007/blob-spawn/releases/download/${MCP_TAG}/${MCP_ASSET}`
export const MCP_BIN = "blob-spawn-mcp"

export function execArgs(outputDir: string) {
  return [
    "exec",
    "--yes",
    "--allow-remote=all",
    `--package=${MCP_RELEASE_URL}`,
    "--",
    MCP_BIN,
    "--output-dir",
    outputDir,
  ]
}

export function installCommand(outputDir: string) {
  return `npm ${execArgs(outputDir).join(" ")}`
}

export type McpClient = "claude" | "cursor" | "opencode" | "vscode"

export function clientConfig(client: McpClient, outputDir: string) {
  const env = { BLOB_SPAWN_OUTPUT_DIR: outputDir }

  if (client === "opencode") {
    return {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        "blob-spawn": {
          type: "local",
          command: ["npm", ...execArgs(outputDir)],
          enabled: true,
          environment: env,
        },
      },
    }
  }

  if (client === "vscode") {
    return {
      servers: {
        "blob-spawn": {
          type: "stdio",
          command: "npm",
          args: execArgs(outputDir),
          env,
        },
      },
    }
  }

  return {
    mcpServers: {
      "blob-spawn": {
        command: "npm",
        args: execArgs(outputDir),
        env,
      },
    },
  }
}
