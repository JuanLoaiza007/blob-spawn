## MODIFIED Requirements

### Requirement: Estimate PDF size before generation
The system SHALL show an approximate size estimate based on active pages or expected pages, image, text, document configuration, and whether optional PDF security is enabled, and SHALL distinguish it from an exact final-size guarantee.

#### Scenario: Estimate page-count configuration
- **WHEN** the user changes page count, PDF content parameters, or the security activation state
- **THEN** the approximate estimate updates to account for the selected configuration

#### Scenario: Estimate final-size configuration
- **WHEN** the user selects final-size mode
- **THEN** the target and expected page count or range are shown when available, together with any security-related minimum-size limitation

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
