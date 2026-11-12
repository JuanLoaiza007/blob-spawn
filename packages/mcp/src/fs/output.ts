import { createHash, randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { copyFile, link, open, rename, rm, stat } from "node:fs/promises"
import { basename, dirname } from "node:path"

import { McpToolError } from "../errors"

export type WriteOutputResult = {
  path: string
  bytes: number
  sha256: string
}

async function publish(tempPath: string, destination: string, overwrite: boolean) {
  if (overwrite) {
    await rename(tempPath, destination)
    return
  }

  try {
    await link(tempPath, destination)
    await rm(tempPath, { force: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new McpToolError("OUTPUT_EXISTS", `${basename(destination)} already exists`, "Pass overwrite: true to replace it.")
    }
    if (["EPERM", "EXDEV", "ENOTSUP"].includes((error as NodeJS.ErrnoException).code ?? "")) {
      await copyFile(tempPath, destination, constants.COPYFILE_EXCL)
      await rm(tempPath, { force: true })
      return
    }
    throw error
  }
}

export async function writeOutput(
  destination: string,
  chunks: Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
  overwrite: boolean,
): Promise<WriteOutputResult> {
  const directory = dirname(destination)
  const tempPath = `${directory}/.${basename(destination)}.${randomUUID()}.tmp`
  const hash = createHash("sha256")
  let bytes = 0
  let handle

  try {
    handle = await open(tempPath, "wx", 0o600)
    for await (const chunk of chunks) {
      if (!(chunk instanceof Uint8Array)) {
        throw new McpToolError("OUTPUT_WRITE_FAILED", "generator produced a non-binary chunk")
      }
      hash.update(chunk)
      bytes += chunk.length
      let offset = 0
      while (offset < chunk.length) {
        const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset)
        offset += bytesWritten
      }
    }
    await handle.close()
    handle = undefined

    await publish(tempPath, destination, overwrite)

    const written = await stat(destination)
    if (written.size !== bytes) {
      throw new McpToolError("OUTPUT_WRITE_FAILED", `expected ${bytes} bytes on disk but found ${written.size}`)
    }

    return { path: destination, bytes, sha256: hash.digest("hex") }
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined)
    }
    await rm(tempPath, { force: true }).catch(() => undefined)
    if (error instanceof McpToolError) throw error
    throw new McpToolError("OUTPUT_WRITE_FAILED", error instanceof Error ? error.message : String(error))
  }
}
