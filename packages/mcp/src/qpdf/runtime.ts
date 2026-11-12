import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

const require = createRequire(import.meta.url)
const moduleDirectory = dirname(fileURLToPath(import.meta.url))

type QpdfContext = {
  FS: {
    writeFile(path: string, bytes: Uint8Array): void
    readFile(path: string): Uint8Array
    unlink(path: string): void
    analyzePath(path: string): { exists: boolean }
  }
  callMain(args: string[]): number
  EXITSTATUS?: number
}

let contextPromise: Promise<QpdfContext> | undefined

function findAssetDirectory() {
  const candidates = [
    join(moduleDirectory, "qpdf"),
    join(moduleDirectory, "vendor", "qpdf"),
    join(moduleDirectory, "../vendor/qpdf"),
    join(moduleDirectory, "../../vendor/qpdf"),
  ]
  const found = candidates.find((candidate) => existsSync(join(candidate, "qpdf.js")) && existsSync(join(candidate, "qpdf.wasm")))
  if (!found) {
    throw new Error("qpdf WebAssembly assets are missing from the package")
  }
  return found
}

export function hasQpdfAssets() {
  try {
    findAssetDirectory()
    return true
  } catch {
    return false
  }
}

async function loadContext(): Promise<QpdfContext> {
  const directory = findAssetDirectory()
  const script = await readFile(join(directory, "qpdf.js"), "utf8")
  const wasmPath = join(directory, "qpdf.wasm")

  let resolveReady: () => void
  let rejectReady: (error: unknown) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const Module = {
    thisProgram: "qpdf",
    noInitialRun: true,
    print: () => undefined,
    printErr: () => undefined,
    onRuntimeInitialized: () => resolveReady(),
    onAbort: (reason: unknown) => rejectReady(reason),
    locateFile: (path: string) => (path.endsWith(".wasm") ? wasmPath : path),
    quit: (status: number, toThrow: unknown) => {
      if (toThrow) throw toThrow
      throw status
    },
  }

  const sandbox = {
    Module,
    require,
    process,
    Buffer,
    console,
    WebAssembly,
    setTimeout,
    clearTimeout,
    __dirname: directory,
    __filename: join(directory, "qpdf.js"),
  } as Record<string, unknown>
  sandbox.globalThis = sandbox
  sandbox.self = sandbox

  vm.createContext(sandbox)
  vm.runInContext(script, sandbox)

  const timer = setTimeout(() => rejectReady(new Error("qpdf initialization timed out")), 20_000)
  try {
    await ready
  } finally {
    clearTimeout(timer)
  }

  return sandbox as unknown as QpdfContext
}

function getContext() {
  contextPromise ??= loadContext()
  return contextPromise
}

export type QpdfRunOptions = {
  inputs: Record<string, Uint8Array>
  outputs: string[]
  args: string[]
}

export async function runQpdfOnce({ inputs, outputs, args }: QpdfRunOptions) {
  const context = await getContext()
  const touched = [...Object.keys(inputs), ...outputs]

  const cleanup = () => {
    for (const name of touched) {
      try {
        if (context.FS.analyzePath(name).exists) context.FS.unlink(name)
      } catch {
        // Best-effort cleanup of the in-memory filesystem.
      }
    }
  }

  cleanup()
  try {
    for (const [name, bytes] of Object.entries(inputs)) {
      context.FS.writeFile(name, bytes)
    }

    let status = 0
    try {
      const result = context.callMain(args)
      status = Number.isFinite(result) ? result : (context.EXITSTATUS ?? 0)
    } catch (error) {
      status = context.EXITSTATUS ?? (typeof error === "number" ? error : -1)
      if (!status) throw error
    }

    if (status !== 0 && status !== 3) {
      throw new Error(`qpdf exited with status ${status}`)
    }

    const result: Record<string, Uint8Array> = {}
    for (const name of outputs) {
      if (!context.FS.analyzePath(name).exists) {
        throw new Error(`qpdf did not produce ${name}`)
      }
      result[name] = new Uint8Array(context.FS.readFile(name))
    }
    return result
  } finally {
    cleanup()
  }
}
