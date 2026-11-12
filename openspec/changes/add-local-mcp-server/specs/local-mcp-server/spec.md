# Spec Delta

## Purpose

Permite que agentes de IA generen fixtures de tamaño exacto en la máquina del usuario mediante MCP, sin enviar contenido a servidores ni añadir cómputo al despliegue web.

## ADDED Requirements

### Requirement: Local stdio MCP server

The system SHALL provide an MCP server that communicates over stdio and runs on Node.js 20 or later on Linux, macOS, and Windows.

#### Scenario: Start the server
- **WHEN** an MCP client launches the published binary without arguments
- **THEN** the server completes initialization and exposes its tools over stdio

#### Scenario: Protocol stream stays clean
- **WHEN** the server writes diagnostics or debug information
- **THEN** it writes them to stderr and reserves stdout exclusively for MCP protocol messages

#### Scenario: Supported platforms
- **WHEN** the server runs on Linux, macOS, or Windows with a supported Node.js version
- **THEN** generation, path validation, and file writing behave equivalently

### Requirement: Discover supported generators

The system SHALL expose a tool that returns the supported file types, their configurable fields, defaults, and hard limits without generating a file.

#### Scenario: List generators
- **WHEN** a client calls the discovery tool
- **THEN** the response includes TXT, JSON, CSV, and PDF, their extensions, MIME types, fields, defaults, and limits

#### Scenario: Report configuration state
- **WHEN** a client calls the discovery tool before an output directory is configured
- **THEN** the response reports that generation is unavailable and explains how to configure the output directory

#### Scenario: Report security availability
- **WHEN** a client calls the discovery tool
- **THEN** the response indicates whether PDF encryption is available in the current installation

### Requirement: Generate exact-size text files

The system SHALL generate TXT, JSON, and CSV files whose final byte length equals the requested size exactly, with format-specific validity preserved.

#### Scenario: Exact plain text
- **WHEN** a client requests a TXT file of a valid size
- **THEN** the written file contains exactly that many bytes and readable text

#### Scenario: Valid JSON
- **WHEN** a client requests a JSON file of a valid size
- **THEN** the written file contains exactly that many bytes and parses as JSON with the configured key

#### Scenario: Valid CSV
- **WHEN** a client requests a CSV file of a valid size
- **THEN** the written file contains exactly that many bytes, a header, and consistently structured rows

#### Scenario: Size limits
- **WHEN** a client requests a size below the minimum or above the configured maximum
- **THEN** the system rejects the request before creating any file and reports the allowed range

### Requirement: Generate PDF by page count or final size

The system SHALL generate PDFs in page-count mode or exact-final-size mode, with every page containing the deterministic image, literal text, and fixed source hyperlink used by the web generator.

#### Scenario: Generate by page count
- **WHEN** a client requests a page count within the supported range
- **THEN** the written PDF contains exactly that many pages and remains readable

#### Scenario: Generate by final size
- **WHEN** a client requests an exact final size at or above the structural minimum
- **THEN** the written PDF has exactly that many bytes and remains readable

#### Scenario: Invalid PDF configuration
- **WHEN** the page count, target size, or text violates validation rules
- **THEN** the system rejects the request before creating any file and reports the violated rule

### Requirement: Apply optional PDF security profile

The system SHALL apply the existing fixed PDF security credentials and selectable restrictions when security is enabled, and SHALL reject exact-final-size mode combined with security.

#### Scenario: Unrestricted by default
- **WHEN** a client generates a PDF without enabling security
- **THEN** the output contains no encryption dictionary and matches the unrestricted web output behavior

#### Scenario: Secured PDF
- **WHEN** a client enables security and selects zero or more restrictions
- **THEN** the output is encrypted with the fixed owner and user passwords and applies the selected representable restrictions

#### Scenario: Security unavailable
- **WHEN** security is enabled but the encryption backend cannot run
- **THEN** the system fails with an actionable error and does not write an unencrypted file

#### Scenario: Security with exact size
- **WHEN** a client combines exact-final-size mode with security
- **THEN** the system rejects the request before generation with an explicit incompatibility error

### Requirement: Confine output to configured directory

The system SHALL require an explicit output directory and SHALL reject any resolved destination outside it.

#### Scenario: Missing output directory
- **WHEN** a generation tool is called without a configured output directory
- **THEN** the system fails without writing a file and explains how to configure it

#### Scenario: Relative subdirectory
- **WHEN** a client requests an optional relative subdirectory inside the configured root
- **THEN** the system creates or uses it only if it resolves inside the root

#### Scenario: Path escape
- **WHEN** a client supplies traversal segments, an absolute path outside the root, or a symlink that escapes the root
- **THEN** the system rejects the request and writes nothing

#### Scenario: Platform-specific names
- **WHEN** a filename uses reserved Windows names, trailing dots or spaces, or a path separator
- **THEN** the system rejects or safely normalizes the name before writing

### Requirement: Write files atomically without silent overwrite

The system SHALL write each output to a temporary file in the destination directory, publish it with an atomic rename, and refuse to replace an existing file unless the client explicitly opts in.

#### Scenario: Successful atomic write
- **WHEN** generation completes
- **THEN** the destination contains the complete file and no temporary artifact remains

#### Scenario: Existing destination
- **WHEN** the destination file already exists and overwrite was not requested
- **THEN** the system fails without modifying the existing file

#### Scenario: Explicit overwrite
- **WHEN** the destination exists and the client requests overwrite
- **THEN** the existing file is replaced only after the new output is complete

#### Scenario: Interrupted write
- **WHEN** writing or verification fails partway through
- **THEN** the destination is left unchanged and temporary files are removed

### Requirement: Return verifiable generation metadata

The system SHALL return the absolute output path, actual byte size, MIME type, and SHA-256 digest for every generated file, plus the page count for PDFs.

#### Scenario: Text metadata
- **WHEN** a text file is generated
- **THEN** the response reports a byte size equal to the file's stat size and a digest matching the written bytes

#### Scenario: PDF metadata
- **WHEN** a PDF is generated
- **THEN** the response reports the byte size, digest, and page count consistent with the written file

#### Scenario: No content in context
- **WHEN** a file is generated
- **THEN** the response references the file by path and metadata without embedding its full contents

### Requirement: Report actionable failures

The system SHALL return structured, non-success tool results for validation, path, encryption, and write failures, without exposing stack traces.

#### Scenario: Validation failure
- **WHEN** an input violates a schema or generation rule
- **THEN** the result is marked as an error and identifies the rule and corrective action

#### Scenario: Write failure
- **WHEN** the destination cannot be created or written
- **THEN** the result is marked as an error, includes the failure category, and no success metadata is returned

#### Scenario: No false success
- **WHEN** any verification step fails
- **THEN** the system does not report the file as generated

### Requirement: Operate without remote services

The system SHALL perform discovery, generation, encryption, and verification locally without network requests, telemetry, or remote storage.

#### Scenario: Offline generation
- **WHEN** the machine has no network connectivity after the package is installed
- **THEN** all tools continue to work

#### Scenario: Web deployment remains static
- **WHEN** the project is deployed to Vercel
- **THEN** the deployment contains no MCP endpoint, serverless function, or storage dependency for this capability

### Requirement: Install and configure from GitHub Releases

The system SHALL be distributed as a versioned GitHub Release tarball with a `blob-spawn-mcp` binary, a SHA-256 checksum, documented client configuration, and support for an output directory through a command-line flag or environment variable. It SHALL NOT require an npm registry publication or npm account.

#### Scenario: Run from the release tarball
- **WHEN** a user configures a client with `npm exec --yes --allow-remote=all --package=<release-url> -- blob-spawn-mcp`
- **THEN** the client can launch the server without a global installation or npm login

#### Scenario: npm 12 remote install policy
- **WHEN** npm 12 uses its default `allow-remote=none`
- **THEN** the documented install command includes `--allow-remote=all` and installs the release tarball successfully

#### Scenario: Versioned release asset
- **WHEN** a release tagged `mcp-vX.Y.Z` is published
- **THEN** it contains `blob-spawn-mcp-X.Y.Z.tgz` and its `.sha256` checksum, and the tag matches the package version

#### Scenario: Configure output directory
- **WHEN** the user sets the documented flag or environment variable
- **THEN** generation tools write inside that directory

#### Scenario: Installation documentation
- **WHEN** the user visits the static `/mcp` page
- **THEN** it shows installation, client configuration examples, tool descriptions, limits, and the local-execution privacy note
