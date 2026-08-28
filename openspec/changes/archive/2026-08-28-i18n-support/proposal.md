## Why

The application currently hard-codes all UI labels, validation errors, and generator messages in Spanish. To reach a broader audience, it needs full English support with automatic browser-language detection, manual override, and persistence so the user's choice survives page reloads. The app is a static client-side export — no server, no routing — which means i18n must live entirely on the client.

## What Changes

- New `lib/i18n/` module with a React context provider, dictionary JSON files for `es` and `en`, and a `useI18n()` hook exposing `t("key")`, the current `locale`, and a `setLocale()` setter
- Browser-language detection (`navigator.language`) on first visit, fallback to English
- Manual language toggle button in the header that switches locale immediately
- `localStorage` persistence of the user's choice
- Refactor all hard-coded Spanish strings in `page.tsx` to use `t("key")` lookups
- Convert validation and generator error messages in `validation.ts`, `pdf.ts`, and `pdf-security.ts` from literal Spanish strings to error-code constants, with translations resolved through the i18n system
- Update tests that currently assert against literal Spanish error strings to assert against error codes instead

## Capabilities

### New Capabilities
- `i18n-support`: Client-side internationalization — locale detection, persistence, runtime switching, and string translation through a React context

### Modified Capabilities
- *(none — all existing capabilities are about file generation behavior, which does not change; only the error messages' *form* changes, not the validation rules themselves)*

## Impact

| Area | Impact |
|---|---|
| `page.tsx` | ~50+ inline Spanish strings replaced with `t("key")` calls |
| `lib/generators/validation.ts` | Error string literals → error-code constants |
| `lib/generators/pdf.ts` | Error string literals → error-code constants |
| `lib/generators/pdf-security.ts` | Warning string literals → error-code constants |
| `openspec/specs/` | No spec-level behavior changes — validation rules and limits stay identical |
| `tests/generators.test.ts` | Assertions on error strings → assert on error codes |
| `tests/pdf.test.ts` | Assertions on error strings → assert on error codes |
| `tests/pdf-security.integration.test.ts` | Likely no changes (integration tests tend not to check Spanish strings) |
| Bundle | +~1 KB (dictionary JSON + context code, zero new dependencies) |