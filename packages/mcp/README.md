# @juanloaiza/blob-spawn-mcp

Local MCP server for [BlobSpawn](https://blob-spawn.vercel.app). Generates exact-size TXT, JSON, CSV, and PDF test fixtures on your own machine and writes them to disk. Nothing is uploaded to a server.

## Requirements

- Node.js 20 or later
- An MCP client that supports stdio

## Install

The package is distributed as a GitHub Release tarball. There is no npm registry publication and no npm account is required.

```bash
npm exec --yes --allow-remote=all \
  --package=https://github.com/JuanLoaiza007/blob-spawn/releases/download/mcp-v0.1.0/blob-spawn-mcp-0.1.0.tgz \
  -- blob-spawn-mcp --output-dir /home/you/fixtures
```

`--allow-remote=all` is required by npm 12, which defaults `allow-remote` to `none` for URL installs. The release also publishes `blob-spawn-mcp-0.1.0.tgz.sha256` if you want to verify the download before running it.

## Configuration

The server requires an explicit output directory. The directory is the security boundary for every write. Without it, discovery still works but generation fails with `OUTPUT_DIR_NOT_CONFIGURED`.

```bash
npm exec --yes --allow-remote=all --package=<release-url> -- blob-spawn-mcp --output-dir /home/you/fixtures
```

Options:

| Flag | Environment | Default |
|---|---|---|
| `--output-dir <path>` | `BLOB_SPAWN_OUTPUT_DIR` | none, required for generation |
| `--max-text-bytes <n>` | `BLOB_SPAWN_MAX_TEXT_BYTES` | `2000000000` |
| `--max-pdf-bytes <n>` | `BLOB_SPAWN_MAX_PDF_BYTES` | `104857600` |
| `--allow-overwrite` | `BLOB_SPAWN_ALLOW_OVERWRITE` | `false` |
| `--qpdf <path>` | `BLOB_SPAWN_QPDF` | bundled qpdf WebAssembly |
| `--debug` | `BLOB_SPAWN_DEBUG` | `false` |

## Client configuration

Claude Desktop and Cursor:

```json
{
  "mcpServers": {
    "blob-spawn": {
      "command": "npm",
      "args": [
        "exec",
        "--yes",
        "--allow-remote=all",
        "--package=https://github.com/JuanLoaiza007/blob-spawn/releases/download/mcp-v0.1.0/blob-spawn-mcp-0.1.0.tgz",
        "--",
        "blob-spawn-mcp",
        "--output-dir",
        "/home/you/fixtures"
      ],
      "env": {
        "BLOB_SPAWN_OUTPUT_DIR": "/home/you/fixtures"
      }
    }
  }
}
```

OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "blob-spawn": {
      "type": "local",
      "command": [
        "npm",
        "exec",
        "--yes",
        "--allow-remote=all",
        "--package=https://github.com/JuanLoaiza007/blob-spawn/releases/download/mcp-v0.1.0/blob-spawn-mcp-0.1.0.tgz",
        "--",
        "blob-spawn-mcp",
        "--output-dir",
        "/home/you/fixtures"
      ],
      "enabled": true,
      "environment": {
        "BLOB_SPAWN_OUTPUT_DIR": "/home/you/fixtures"
      }
    }
  }
}
```

VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "blob-spawn": {
      "type": "stdio",
      "command": "npm",
      "args": [
        "exec",
        "--yes",
        "--allow-remote=all",
        "--package=https://github.com/JuanLoaiza007/blob-spawn/releases/download/mcp-v0.1.0/blob-spawn-mcp-0.1.0.tgz",
        "--",
        "blob-spawn-mcp",
        "--output-dir",
        "/home/you/fixtures"
      ],
      "env": {
        "BLOB_SPAWN_OUTPUT_DIR": "/home/you/fixtures"
      }
    }
  }
}
```

Update the release URL when a new `mcp-v*` tag is published.

## Tools

### `list_file_types`

Returns the supported types, fields, defaults, limits, output configuration status, and whether PDF encryption is available.

### `generate_text_file`

```json
{
  "type": "json",
  "sizeBytes": 5000000,
  "filename": "cliente",
  "subdir": "fixtures",
  "overwrite": false,
  "contentSource": "lorem",
  "jsonKey": "data",
  "csvHeader": "data"
}
```

- `type`: `txt`, `json`, or `csv`.
- `sizeBytes`: exact final size, 1000 to the configured maximum.
- `filename`: letters, numbers, underscores, hyphens. The extension is added automatically.
- `overwrite`: defaults to `false`.

### `estimate_pdf`

```json
{ "mode": "pages", "pageCount": 10, "text": "BlobSpawn PDF test" }
```

or

```json
{ "mode": "size", "targetBytes": 1000000, "text": "BlobSpawn PDF test" }
```

Returns estimated bytes and page count without writing a file.

### `generate_pdf_file`

Same fields as `estimate_pdf`, plus `filename`, `subdir`, and `overwrite`.

- Page mode: 1 to 1,000 pages.
- Size mode: exact final size. Not compatible with security.
- Every page contains a deterministic image, literal text, and the fixed `https://blob-spawn.vercel.app` link.
- Text is literal, up to 500 characters and 2,000 UTF-8 bytes.

## PDF security

Security is optional and applies the same profile as the web app:

- Fixed passwords: `user-password` and `owner-password`.
- Ten configurable restrictions: printing, changing the document, document assembly, content copying, accessibility extraction, page extraction, commenting, form filling, signing, and template pages.
- AES-256 encryption through qpdf.

The package bundles qpdf WebAssembly, so encryption works on Linux, macOS, and Windows without installing qpdf. If the WebAssembly runtime cannot start, the server falls back to a `qpdf` binary found in `PATH` or passed with `--qpdf`. If neither is available, `list_file_types` reports `security.available: false` and secured generation fails with `PDF_SECURITY_UNAVAILABLE` without writing a file.

These are cooperative PDF permissions, not DRM.

## Output behavior

- Every write is confined to the configured directory. Absolute paths, traversal segments, and symlinks escaping the root are rejected.
- Files are written to a temporary file and published atomically.
- Existing files are not replaced unless `overwrite: true` or `--allow-overwrite` is set.
- Responses include the absolute path, actual byte size, SHA-256, MIME type, and page count for PDFs. File contents are never embedded in the response.
- Windows-reserved names (`CON`, `PRN`, `LPT1`, and similar) are rejected.

## Limits

| Item | Limit |
|---|---|
| Text minimum | 1 KB |
| Text maximum | 2 GB by default |
| PDF pages | 1 to 1,000 |
| PDF text | 500 characters / 2,000 UTF-8 bytes |
| PDF size | 100 MB by default, configurable |
| PDF size + security | Not supported |

PDFs are assembled in memory. For very large PDFs, raise `--max-pdf-bytes` only if the machine has enough RAM.

## Development

From this directory:

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm test` builds the package first so the stdio protocol test can spawn `dist/index.js`.

## License

MIT
