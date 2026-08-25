# pdf-file-generation Specification

## Purpose

Esta capacidad permite generar PDFs dummy locales que contienen páginas reales, una imagen de prueba y texto personalizado, para probar formularios y sistemas consumidores con controles explícitos de páginas, tamaño, estructura, seguridad de entrada e hipervínculos.

## Requirements

### Requirement: Searchable PDF generator
The system SHALL add `.pdf` to the searchable file-type catalog with a visible name, MIME type, and aliases consistent with the existing file generators. Selecting PDF SHALL show the PDF configuration form without changing existing text-format behavior.

#### Scenario: Find and select PDF
- **WHEN** the user searches for `.pdf`, `pdf`, or a configured alias and selects the PDF option
- **THEN** PDF becomes active and the PDF configuration fields are shown

### Requirement: Mutually exclusive PDF output modes
The system SHALL expose page-count mode and final-size mode in the same PDF form, require exactly one active mode, and reject ambiguous configurations. The form SHALL ask for the mode first, immediately followed by the active sizing control, with the text field after it. Inactive labels and controls SHALL not be shown.

#### Scenario: Configure by page count
- **WHEN** the user selects page-count mode
- **THEN** the page-count control is immediately after the mode selector and final-size controls are absent

#### Scenario: Configure by final size
- **WHEN** the user selects final-size mode
- **THEN** final-size controls are immediately after the mode selector and page-count controls are absent

#### Scenario: Ambiguous mode
- **WHEN** no mode or both modes are submitted
- **THEN** generation is prevented with a validation error

### Requirement: Configure and validate PDF pages
The system SHALL accept a positive integer page count within a configurable maximum and SHALL reject zero, negative, fractional, malformed, or out-of-range values.

#### Scenario: Valid page count
- **WHEN** the user enters a page count within the configured range
- **THEN** generation produces exactly that number of physical pages

#### Scenario: Invalid page count
- **WHEN** the user enters an invalid or excessive page count
- **THEN** the form shows an error and prevents generation

### Requirement: Configure and validate PDF final size
The system SHALL accept a positive integer final size using documented decimal units, reject malformed or excessive values, and reject targets smaller than the minimum valid PDF containing the required content.

#### Scenario: Valid final-size target
- **WHEN** the user enters a target at or above the structural minimum and within the application limit
- **THEN** generation is allowed

#### Scenario: Invalid final-size target
- **WHEN** the user enters a malformed, fractional, non-positive, excessive, or too-small target
- **THEN** the form explains the validation error and prevents generation

#### Scenario: Exact final-size output
- **WHEN** the user generates with a valid final-size target
- **THEN** the downloaded Blob has exactly the requested bytes and remains readable as a PDF

### Requirement: Estimate PDF size before generation
The system SHALL show an approximate size estimate based on active pages or expected pages, image, text, document configuration, and whether optional PDF security is enabled, and SHALL distinguish it from an exact final-size guarantee.

#### Scenario: Estimate page-count configuration
- **WHEN** the user changes page count, PDF content parameters, or the security activation state
- **THEN** the approximate estimate updates to account for the selected configuration

#### Scenario: Estimate final-size configuration
- **WHEN** the user selects final-size mode
- **THEN** the target and expected page count or range are shown when available, together with any security-related minimum-size limitation

### Requirement: Include image and text on every PDF page
The system SHALL generate a valid PDF in which every page contains a recognizable application-generated raster image and configured text, without requiring a user-uploaded asset.

#### Scenario: Generated page content
- **WHEN** the user generates a valid PDF
- **THEN** every page contains the deterministic image pattern and readable literal text

### Requirement: Limit and safely handle custom text
The system SHALL impose and display hard character and UTF-8 byte limits. Text SHALL be normalized and rendered literally; HTML, Markdown, scripts, PDF actions, URLs, and template expressions SHALL NOT become executable or interactive content.

#### Scenario: Valid and excessive text
- **WHEN** the user enters text within or beyond the configured limits
- **THEN** valid text is accepted and excessive text prevents generation

#### Scenario: Malicious-looking text
- **WHEN** the user enters markup, script-like text, PDF syntax, or template delimiters
- **THEN** the value is displayed as text and cannot create actions, links, annotations, or objects

### Requirement: Validate and complete the PDF filename
The system SHALL reuse filename-base restrictions, append `.pdf`, and never derive the filename from custom text or metadata.

#### Scenario: PDF filename
- **WHEN** the user enters an allowed or disallowed filename base
- **THEN** the download uses a safe base with `.pdf` or prevents unsafe path characters

### Requirement: Generate and download PDFs locally
The system SHALL generate entirely in the browser without sending input or output to a server, optionally apply the selected PDF security profile before download, verify the resulting Blob and required document properties, and require confirmation for large outputs.

#### Scenario: Successful or failed generation
- **WHEN** generation succeeds or fails with security disabled or enabled
- **THEN** a verified PDF is downloaded on success, while failure shows an error and no misleading download

#### Scenario: Large PDF confirmation
- **WHEN** the target or estimate exceeds the application's large-file warning threshold
- **THEN** explicit confirmation is required before starting generation and explains the possible memory and browser-performance impact, including the additional cost of security processing when applicable

#### Scenario: Exact size with security
- **WHEN** the user requests exact final-size mode with security enabled
- **THEN** the system either produces a structurally valid secured PDF with exactly the requested byte count or rejects the configuration with an explicit unsupported-size/security error before download

### Requirement: Include a source hyperlink outside the page frame
The system SHALL render `blob-spawn.vercel.app` in the lower-right area of every page, below and outside the visible frame, and associate it with a hyperlink targeting exactly `https://blob-spawn.vercel.app`.

#### Scenario: Source URL is visible and clickable
- **WHEN** the user opens a generated PDF and activates the visible source URL
- **THEN** the label is outside the frame and the reader follows `https://blob-spawn.vercel.app`

#### Scenario: Source URL is not user-controlled
- **WHEN** custom text contains another URL or PDF action syntax
- **THEN** only the fixed application source hyperlink exists and its destination is unchanged
