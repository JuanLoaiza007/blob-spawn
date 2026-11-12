import { describe, expect, it } from "vitest"

import {
  MCP_ASSET,
  MCP_RELEASE_URL,
  MCP_TAG,
  MCP_VERSION,
  clientConfig,
  execArgs,
  installCommand,
  type McpClient,
} from "../lib/mcp-distribution"

describe("MCP distribution", () => {
  it("publishes a versioned GitHub Release asset", () => {
    expect(MCP_TAG).toBe(`mcp-v${MCP_VERSION}`)
    expect(MCP_ASSET).toBe(`blob-spawn-mcp-${MCP_VERSION}.tgz`)
    expect(MCP_RELEASE_URL).toBe(
      `https://github.com/JuanLoaiza007/blob-spawn/releases/download/${MCP_TAG}/${MCP_ASSET}`,
    )
  })

  it("uses npm exec with the npm 12 remote flag", () => {
    const args = execArgs("/tmp/fixtures")
    expect(args).toContain("exec")
    expect(args).toContain("--allow-remote=all")
    expect(args).toContain(`--package=${MCP_RELEASE_URL}`)
    expect(args.at(-3)).toBe("blob-spawn-mcp")
    expect(installCommand("/tmp/fixtures")).toContain("--output-dir /tmp/fixtures")
  })

  it.each(["claude", "cursor", "opencode", "vscode"] satisfies McpClient[])(
    "builds a %s configuration that invokes npm exec",
    (client) => {
      const config = clientConfig(client, "/tmp/fixtures") as unknown as {
        mcp: { "blob-spawn": { command: string[] } }
        servers: { "blob-spawn": { command: string; args: string[] } }
        mcpServers: { "blob-spawn": { command: string; args: string[] } }
      }
      if (client === "opencode") {
        expect(config.mcp["blob-spawn"].command[0]).toBe("npm")
        expect(config.mcp["blob-spawn"].command).toContain(`--package=${MCP_RELEASE_URL}`)
      } else if (client === "vscode") {
        expect(config.servers["blob-spawn"].command).toBe("npm")
        expect(config.servers["blob-spawn"].args).toContain(`--package=${MCP_RELEASE_URL}`)
      } else {
        expect(config.mcpServers["blob-spawn"].command).toBe("npm")
        expect(config.mcpServers["blob-spawn"].args).toContain(`--package=${MCP_RELEASE_URL}`)
      }
    },
  )
})
