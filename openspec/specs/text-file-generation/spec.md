# text-file-generation Specification

## Purpose

Esta capacidad permite generar y descargar archivos de prueba de texto válidos, de forma privada en el navegador, con un tamaño expresado y verificado estrictamente en bytes.

## Requirements

### Requirement: Searchable file type catalog

The system SHALL present the user with a combobox-like searchable selector containing the file types supported by this iteration: `.txt`, `.json`, and `.csv`. Each type SHALL have a configurable display name and a configurable set of search aliases, including its extension and human-readable terms. The search query SHALL remain separate from the currently selected file type. Typing or editing the query SHALL only filter the visible options; the active type and its form SHALL change only after the user selects an option or confirms a matching option with Enter.

#### Scenario: Resolve a type by extension
- **WHEN** the user types `.txt` or `txt` into the selector
- **THEN** the options list filters to the plain-text generator while the active type changes only after explicit selection

#### Scenario: Resolve a type by alias
- **WHEN** the user types a configured alias such as `Texto plano`
- **THEN** the options list filters to the corresponding file type without changing the active form until the option is selected

#### Scenario: Select a filtered option
- **WHEN** the user clicks or otherwise selects a visible filtered file type
- **THEN** that type becomes active, the selector reflects the selected option, and the form changes to its parameters

#### Scenario: Confirm the best match with Enter
- **WHEN** the user presses Enter while the filtered options list contains one or more matches
- **THEN** the first option ranked as the best match becomes active and the form changes to its parameters

#### Scenario: Continue typing without selection
- **WHEN** the user edits the query after a type has already been selected but does not select a new option
- **THEN** the previously selected type and form remain active while only the options list changes

#### Scenario: Unsupported search
- **WHEN** the search does not match any configured extension, display name, or alias
- **THEN** the options list shows that no supported type matches and the active type and form remain unchanged

### Requirement: Adaptive generator parameters

The system SHALL display a configuration form after a supported type is selected. Every supported type SHALL expose a positive target size, a size unit, and a filename base; format-specific parameters SHALL be displayed only when relevant to that type.

#### Scenario: Select plain text
- **WHEN** the user selects `.txt`
- **THEN** the form exposes a text-content source such as Lorem Ipsum and does not expose JSON- or CSV-specific options

#### Scenario: Select JSON
- **WHEN** the user selects `.json`
- **THEN** the form exposes JSON-specific options and identifies the output as JSON

#### Scenario: Select CSV
- **WHEN** the user selects `.csv`
- **THEN** the form exposes CSV-specific options and identifies the output as CSV

### Requirement: Validate generation configuration

The system SHALL accept target sizes from 1 KB through 2048 MB according to the selected unit, SHALL reject zero, negative, fractional, malformed, or out-of-range values, and SHALL enforce a configurable application maximum that the user cannot increase through the interface.

#### Scenario: Valid minimum size
- **WHEN** the user enters the minimum supported size of 1 KB
- **THEN** the configuration is valid and generation can proceed subject to the configured application maximum

#### Scenario: Invalid size
- **WHEN** the user enters a non-positive, non-numeric, fractional, or out-of-range size
- **THEN** the form shows a validation message and prevents generation

#### Scenario: Application maximum is lower than the input ceiling
- **WHEN** the user requests a size above the configured application maximum
- **THEN** the system rejects the request and explains that it exceeds the application limit

### Requirement: Warn before large generation

The system SHALL show a friendly warning requiring explicit confirmation when the requested size is greater than 500 MB. The warning SHALL explain that large files may consume substantial RAM and slow the browser, and generation SHALL NOT begin until the user confirms.

#### Scenario: Large file requires confirmation
- **WHEN** the user attempts to generate a valid file larger than 500 MB
- **THEN** the system shows the large-file warning with a `Confirmar` action and does not start generation

#### Scenario: Large file is confirmed
- **WHEN** the user confirms the large-file warning
- **THEN** the system proceeds with generation using the already validated configuration

#### Scenario: Large file is cancelled
- **WHEN** the user dismisses or cancels the large-file warning
- **THEN** the system returns to the configuration form without downloading a file

### Requirement: Generate structurally valid text formats

The system SHALL generate a `.txt` file containing readable text, a `.json` file that parses as valid JSON, and a `.csv` file containing a valid header and consistently structured data rows. The output format SHALL remain valid regardless of the requested supported size.

#### Scenario: Generate readable plain text
- **WHEN** the user generates a `.txt` file with a valid configuration
- **THEN** the downloaded file contains readable text and has MIME type `text/plain`

#### Scenario: Generate valid JSON
- **WHEN** the user generates a `.json` file with a valid configuration
- **THEN** parsing the downloaded UTF-8 content as JSON succeeds and the result has the configured JSON structure

#### Scenario: Generate valid CSV
- **WHEN** the user generates a `.csv` file with a valid configuration
- **THEN** the downloaded content has a header, rows with the same number of fields, and a documented line-ending and delimiter convention

### Requirement: Produce exact UTF-8 byte size

The system SHALL interpret the requested size as an exact byte count after UTF-8 encoding. The downloaded `Blob` SHALL contain exactly the requested number of bytes, independent of the number of Unicode characters or emojis entered or represented by the user. Generators MAY use ASCII padding or byte arrays to reach the exact size, but SHALL preserve structural validity for JSON and CSV.

#### Scenario: Exact ASCII text size
- **WHEN** the user requests a plain-text file of 5 MB
- **THEN** the generated file contains exactly 5 MB in the selected byte unit when measured from its downloaded bytes

#### Scenario: Unicode does not alter the target size
- **WHEN** a format includes Unicode input or content whose UTF-8 representation uses multiple bytes per character
- **THEN** the generator pads or truncates according to its format rules so the final file still has exactly the requested byte count

#### Scenario: Exact structured format size
- **WHEN** the user requests a JSON or CSV file at a valid target size
- **THEN** the file remains parseable/structurally valid and its byte length equals the requested target

### Requirement: Validate and complete the filename

The system SHALL accept a filename base containing only Unicode letters, including accented letters, numbers, hyphens, and underscores. The input SHALL communicate this restriction, SHALL prevent or reject other characters, and SHALL append the selected extension automatically.

#### Scenario: Valid filename base
- **WHEN** the user enters a base name such as `prueba-á_01`
- **THEN** the system accepts it and downloads the selected type using the corresponding extension

#### Scenario: Invalid filename character
- **WHEN** the user attempts to enter a space, slash, backslash, punctuation, or another disallowed character
- **THEN** the system prevents or removes the character and displays the filename restriction

### Requirement: Download locally without server processing

The system SHALL generate and download the file entirely in the browser. File contents and configuration SHALL NOT be sent to a server or persisted remotely.

#### Scenario: Successful local download
- **WHEN** the user clicks `Spawn` with a valid and confirmed configuration
- **THEN** the browser downloads the generated file without requiring an API request

#### Scenario: Generation failure
- **WHEN** the browser cannot allocate enough resources or generation fails
- **THEN** the system shows an actionable error, does not claim success, and does not leave a misleading download state
