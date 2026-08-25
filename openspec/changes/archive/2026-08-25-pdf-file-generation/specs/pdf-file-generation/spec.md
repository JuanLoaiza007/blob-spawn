## Purpose

Esta capacidad permite generar PDFs dummy locales que contienen páginas reales, una imagen de prueba y texto personalizado, para probar formularios y sistemas consumidores con controles explícitos de páginas, tamaño, estructura y seguridad de entrada.

## ADDED Requirements

### Requirement: Searchable PDF generator

The system SHALL add `.pdf` to the searchable file-type catalog with a visible name, extension, MIME type, and aliases consistent with the existing file generators. Selecting PDF SHALL replace the active configuration form with PDF-specific parameters without changing the behavior of the existing text formats.

#### Scenario: Find PDF by extension
- **WHEN** the user searches for `.pdf` or `pdf`
- **THEN** the PDF generator appears as a matching option and the active generator remains unchanged until the user selects it

#### Scenario: Select PDF
- **WHEN** the user selects the PDF option
- **THEN** the form identifies the output as PDF and shows the PDF configuration fields

### Requirement: Mutually exclusive PDF output modes

The system SHALL expose page-count mode and final-size mode in the same PDF form, and SHALL require exactly one mode to be active for each generation. Activating one mode SHALL disable or clear the controls belonging exclusively to the other mode, and the generator SHALL reject an ambiguous configuration rather than silently choosing one.
The form SHALL ask for the output mode before mode-specific sizing, and SHALL place the active page-count or final-size control immediately after the mode selector; the text field SHALL follow those sizing controls.

#### Scenario: Configure by page count
- **WHEN** the user selects page-count mode and enters a valid number of pages
- **THEN** generation uses the requested page count and does not use a final-size target

#### Scenario: Configure by final size
- **WHEN** the user selects final-size mode and enters a valid target size
- **THEN** generation uses the target size and does not use a page-count target

#### Scenario: No mode is selected
- **WHEN** the user attempts to generate without exactly one active mode
- **THEN** generation is prevented and the form explains that one output mode must be selected

#### Scenario: Both modes are submitted
- **WHEN** a malformed or stale configuration contains active values for both modes
- **THEN** generation is prevented with a validation error instead of prioritizing one value implicitly

#### Scenario: Page-count field follows mode selector
- **WHEN** the user selects page-count mode
- **THEN** the quantity of pages is the first mode-specific field shown immediately after the mode selector and the final-size controls are not shown

#### Scenario: Final-size field follows mode selector
- **WHEN** the user selects final-size mode
- **THEN** the final-size controls are shown immediately after the mode selector and the page-count label and controls are not shown

### Requirement: Configure and validate PDF pages

The system SHALL allow the user to configure a positive integer page count in page-count mode. The application SHALL enforce a configurable maximum page count and SHALL reject zero, negative, fractional, malformed, or out-of-range values before generation.

#### Scenario: Valid page count
- **WHEN** the user enters a page count within the configured range
- **THEN** the form accepts the configuration and generation can proceed

#### Scenario: Invalid page count
- **WHEN** the user enters zero, a negative value, a fraction, non-numeric text, or a value above the configured maximum
- **THEN** the form shows a validation message and prevents generation

#### Scenario: Generated page count
- **WHEN** a valid page-count configuration is generated
- **THEN** the resulting PDF contains exactly the configured number of physical pages

### Requirement: Configure and validate PDF final size

The system SHALL allow the user to configure a positive integer final PDF size using the application's documented decimal size units. The system SHALL reject invalid, fractional, non-positive, out-of-range, or application-limit-exceeding values, and SHALL reject targets smaller than the minimum valid PDF produced by the configured document structure.

#### Scenario: Valid final-size target
- **WHEN** the user enters a target size at or above the minimum structural PDF size and within the application limit
- **THEN** the final-size configuration is accepted for generation

#### Scenario: Target below structural minimum
- **WHEN** the user requests a size smaller than the minimum valid PDF containing the required image and text content
- **THEN** generation is prevented and the form explains that the target is too small for a valid PDF

#### Scenario: Invalid or excessive final-size target
- **WHEN** the user enters a malformed, fractional, non-positive, or limit-exceeding size
- **THEN** the form shows a validation message and prevents generation

#### Scenario: Exact final-size output
- **WHEN** the user generates a PDF with a valid final-size target
- **THEN** the downloaded Blob has exactly the requested number of bytes and remains structurally readable as a PDF

### Requirement: Estimate PDF size before generation

The system SHALL show an estimated final size for the current PDF content configuration before generation. The estimate SHALL take into account at least the active page count or the expected page count associated with the selected mode, the image resource, the text content, and the document configuration. The interface SHALL distinguish an estimate from an exact final-size guarantee.

#### Scenario: Estimate page-count configuration
- **WHEN** the user selects page-count mode and changes the page count or PDF content parameters
- **THEN** the interface updates an estimated output size and identifies it as approximate

#### Scenario: Preview final-size configuration
- **WHEN** the user selects final-size mode and changes the target or PDF content parameters
- **THEN** the interface shows the target size and an estimate of the resulting document characteristics, including an expected page count or range when available

#### Scenario: Estimate cannot be calculated
- **WHEN** the browser cannot calculate a reliable estimate for the current configuration
- **THEN** the interface communicates that the estimate is unavailable and does not present it as an exact result

### Requirement: Include image and text on every PDF page

The system SHALL generate a valid PDF in which every page contains a recognizable application-generated raster image pattern and the configured text rendered as document text. The image and text SHALL be generated locally and SHALL not require a user-uploaded asset.

#### Scenario: Image is present
- **WHEN** the user generates any valid PDF configuration
- **THEN** every resulting page contains an image resource with the application's deterministic test pattern

#### Scenario: Text is present
- **WHEN** the user supplies valid custom text and generates a PDF
- **THEN** the resulting pages render that text as literal PDF text according to the document layout

#### Scenario: Default text
- **WHEN** the user leaves the text at its supported default value
- **THEN** the PDF still contains readable text on every page

### Requirement: Limit and safely handle custom text

The system SHALL impose a hard configurable maximum on custom text and SHALL communicate the limit and current usage in the form. The system SHALL treat the value as plain text only, normalize supported line breaks, reject or prevent generation for over-limit input, and SHALL not interpret HTML, Markdown, scripts, PDF actions, URLs, or template expressions as executable or interactive content.

#### Scenario: Text within the limit
- **WHEN** the user enters text within the configured character and byte limits
- **THEN** the form accepts it and the PDF renders it as literal text

#### Scenario: Text exceeds the limit
- **WHEN** the user enters more text than the configured maximum
- **THEN** the form indicates the violation and prevents generation until the value is within the limit

#### Scenario: Malicious-looking text
- **WHEN** the user enters markup, script-like text, PDF syntax, or template delimiters within the allowed length
- **THEN** the generated document displays the value as text and does not create a script, link, annotation, action, or additional PDF object controlled by that input

#### Scenario: Unsupported control characters
- **WHEN** the user enters unsupported control characters or invalid line-break sequences
- **THEN** the form normalizes or rejects them according to the documented text policy before generation

### Requirement: Validate and complete the PDF filename

The system SHALL reuse the existing filename-base restrictions for PDF output and SHALL append `.pdf` automatically. The filename SHALL not be derived from custom PDF text or any generated PDF metadata.

#### Scenario: Valid PDF filename
- **WHEN** the user enters an allowed filename base
- **THEN** the download uses that base with the `.pdf` extension

#### Scenario: Invalid PDF filename
- **WHEN** the filename contains a path separator or disallowed character
- **THEN** the form prevents or removes the character and does not allow path traversal through the download name

### Requirement: Generate and download PDFs locally

The system SHALL generate the PDF entirely in the browser, without sending configuration, custom text, image data, or generated bytes to a server. The system SHALL use the existing local download flow and SHALL report success only after a valid Blob has been produced and its size and required document properties have been verified.

#### Scenario: Successful local generation
- **WHEN** the user generates a valid and, when required, confirmed PDF
- **THEN** the browser downloads a PDF with MIME type `application/pdf` without an API request

#### Scenario: Generation failure
- **WHEN** PDF generation fails, cannot allocate required resources, or produces an invalid result
- **THEN** the interface shows an actionable error, does not download a misleading result, and does not report success

#### Scenario: Large PDF confirmation
- **WHEN** the configured or estimated output exceeds the application's large-file warning threshold
- **THEN** the system requires explicit confirmation before starting generation and explains the possible memory and browser-performance impact

### Requirement: Include a source hyperlink outside the page frame

The system SHALL render `blob-spawn.vercel.app` in the lower-right area of every PDF page, below and outside the visible page frame, and SHALL associate that visible label with a hyperlink annotation targeting exactly `https://blob-spawn.vercel.app`.

#### Scenario: Source URL is visible
- **WHEN** the user generates any valid PDF
- **THEN** every page displays `blob-spawn.vercel.app` in the lower-right area outside the frame

#### Scenario: Source URL is clickable
- **WHEN** the user activates the visible source URL in a PDF reader
- **THEN** the reader follows the HTTPS destination `https://blob-spawn.vercel.app`

#### Scenario: Source URL is not user-controlled
- **WHEN** the user supplies custom PDF text containing another URL or PDF action syntax
- **THEN** only the fixed application source hyperlink exists and the custom text does not alter its destination
