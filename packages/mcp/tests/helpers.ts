import { InMemoryTransport, type CallToolResult, type JSONRPCMessage } from "@modelcontextprotocol/server"

import type { ServerConfig } from "../src/config"
import { createServer } from "../src/server"

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

export async function createTestClient(config: ServerConfig) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createServer(config)
  const pending = new Map<number | string, Pending>()
  let nextId = 1

  clientTransport.onmessage = (message: JSONRPCMessage) => {
    if (!("id" in message) || message.id === undefined) return
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if ("error" in message) waiter.reject(new Error(JSON.stringify(message.error)))
    else if ("result" in message) waiter.resolve(message.result)
  }

  await server.connect(serverTransport)
  await clientTransport.start()

  const request = (method: string, params?: unknown) => {
    const id = nextId
    nextId += 1
    return new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      void clientTransport.send({ jsonrpc: "2.0", id, method, params } as JSONRPCMessage)
    })
  }

  await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "blob-spawn-test", version: "1.0.0" },
  })
  await clientTransport.send({ jsonrpc: "2.0", method: "notifications/initialized" } as JSONRPCMessage)

  return {
    request,
    async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
      return (await request("tools/call", { name, arguments: args })) as CallToolResult
    },
    async close() {
      await clientTransport.close()
      await server.close()
    },
  }
}

export function textOf(result: CallToolResult): string {
  return result.content
    .filter((item): item is { type: "text"; text: string } => item.type === "text")
    .map((item) => item.text)
    .join("\n")
}

export function jsonOf<T>(result: CallToolResult): T {
  return JSON.parse(textOf(result)) as T
}
