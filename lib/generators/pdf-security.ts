export const PDF_SECURITY_PASSWORDS = {
  owner: "owner-password",
  user: "user-password",
} as const

export type PdfSecurityRestrictions = {
  printing: boolean
  changingDocument: boolean
  documentAssembly: boolean
  contentCopying: boolean
  accessibilityExtraction: boolean
  pageExtraction: boolean
  commenting: boolean
  formFilling: boolean
  signing: boolean
  templatePages: boolean
}

export const DEFAULT_PDF_SECURITY_RESTRICTIONS: PdfSecurityRestrictions = {
  printing: false,
  changingDocument: false,
  documentAssembly: false,
  contentCopying: false,
  accessibilityExtraction: false,
  pageExtraction: false,
  commenting: false,
  formFilling: false,
  signing: false,
  templatePages: false,
}

export type PdfSecurityOptions = {
  enabled: boolean
  restrictions: PdfSecurityRestrictions
}

export class PdfSecurityError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "PdfSecurityError"
  }
}

export const DEFAULT_PDF_SECURITY: PdfSecurityOptions = {
  enabled: false,
  restrictions: DEFAULT_PDF_SECURITY_RESTRICTIONS,
}

const RESTRICTION_OPTIONS = [
  ["printing", "--print=none"],
  ["changingDocument", "--modify-other=n"],
  ["documentAssembly", "--assemble=n"],
  ["contentCopying", "--extract=n"],
  ["accessibilityExtraction", "--accessibility=n"],
  ["pageExtraction", "--assemble=n"],
  ["commenting", "--annotate=n"],
  ["formFilling", "--form=n"],
  ["signing", "--form=n"],
  ["templatePages", "--assemble=n"],
] as const

function hasRestriction(restrictions: PdfSecurityRestrictions, name: keyof PdfSecurityRestrictions) {
  return restrictions[name]
}

export function getPdfSecurityArguments(restrictions: PdfSecurityRestrictions) {
  const args = ["--encrypt", PDF_SECURITY_PASSWORDS.user, PDF_SECURITY_PASSWORDS.owner, "256"]
  const applied = new Set<string>()

  for (const [name, option] of RESTRICTION_OPTIONS) {
    if (hasRestriction(restrictions, name) && !applied.has(option)) {
      args.push(option)
      applied.add(option)
    }
  }

  return args
}

export function getPdfSecurityWarnings(restrictions: PdfSecurityRestrictions) {
  const warnings: string[] = []
  if (restrictions.accessibilityExtraction) {
    warnings.push("La extracción para accesibilidad no puede restringirse de forma fiable en PDFs modernos.")
  }
  if (restrictions.pageExtraction || restrictions.signing || restrictions.templatePages) {
    warnings.push("Algunas capacidades comparten permisos PDF y pueden variar según el lector.")
  }
  warnings.push("Las restricciones PDF dependen del lector y no son un mecanismo DRM fuerte.")
  return warnings
}

export function hasActivePdfRestriction(restrictions: PdfSecurityRestrictions) {
  return Object.values(restrictions).some(Boolean)
}

export async function applyPdfSecurity(bytes: Uint8Array, restrictions: PdfSecurityRestrictions) {
  const { createQpdfRunner } = await import("qpdf-run")
  const workerUrl = new URL("/qpdf/worker.js", window.location.origin).href
  const qpdfJsUrl = new URL("/qpdf/qpdf.js", window.location.origin).href
  const wasmUrl = new URL("/qpdf/qpdf.wasm", window.location.origin).href
  const runner = await createQpdfRunner({ workerUrl, qpdfJsUrl, wasmUrl })

  try {
    try {
      return await runner.runOne({
        input: bytes,
        inputName: "input.pdf",
        outputName: "output.pdf",
        args: [
          ...getPdfSecurityArguments(restrictions),
          "--",
          "input.pdf",
          "output.pdf",
        ],
      })
    } catch (error) {
      throw new PdfSecurityError("No se pudieron aplicar las restricciones de seguridad PDF.", { cause: error })
    }
  } finally {
    await runner.destroy()
  }
}

export async function decryptPdfForVerification(bytes: Uint8Array) {
  const { createQpdfRunner } = await import("qpdf-run")
  const workerUrl = new URL("/qpdf/worker.js", window.location.origin).href
  const qpdfJsUrl = new URL("/qpdf/qpdf.js", window.location.origin).href
  const wasmUrl = new URL("/qpdf/qpdf.wasm", window.location.origin).href
  const runner = await createQpdfRunner({ workerUrl, qpdfJsUrl, wasmUrl })

  try {
    try {
      return await runner.runOne({
        input: bytes,
        inputName: "secured.pdf",
        outputName: "verified.pdf",
        args: ["--password=" + PDF_SECURITY_PASSWORDS.user, "--decrypt", "--", "secured.pdf", "verified.pdf"],
      })
    } catch (error) {
      throw new PdfSecurityError("El PDF protegido no pudo verificarse con la contraseña de usuario.", { cause: error })
    }
  } finally {
    await runner.destroy()
  }
}
