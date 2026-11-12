import { cp, mkdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = resolve(packageRoot, "../..")
const source = join(repoRoot, "public", "qpdf")
const destination = join(packageRoot, "vendor", "qpdf")

await mkdir(destination, { recursive: true })
for (const file of ["qpdf.js", "qpdf.wasm"]) {
  await cp(join(source, file), join(destination, file))
}
await cp(join(repoRoot, "LICENSE"), join(packageRoot, "LICENSE"))
