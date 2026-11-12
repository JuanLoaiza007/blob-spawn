import type { PdfSecurityRestrictions } from "./pdf-security"

/**
 * Platform-specific PDF encryption implementation. The browser uses qpdf-run
 * inside a Web Worker; the local MCP server can provide a Node backend.
 */
export type PdfSecurityBackend = {
  apply(bytes: Uint8Array, restrictions: PdfSecurityRestrictions): Promise<Uint8Array>
  decrypt(bytes: Uint8Array): Promise<Uint8Array>
}
