export class McpToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = "McpToolError"
  }
}

export function isMcpToolError(error: unknown): error is McpToolError {
  return error instanceof McpToolError
}

export function errorMessage(error: unknown) {
  if (isMcpToolError(error)) {
    return error.hint ? `${error.code}: ${error.message}\n${error.hint}` : `${error.code}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  return String(error)
}
