## Context

The app is a static Next.js export (`output: "export"`) — no server runtime, no middleware, no SSR. All internationalization must happen client-side. The current codebase hard-codes ~50 Spanish strings in `app/page.tsx` and another ~20 error/warning strings across `lib/generators/validation.ts`, `pdf.ts`, and `pdf-security.ts`. Tests assert against those literal Spanish strings.

See `proposal.md - Why` and `proposal.md - Impact` for motivation and scope.

## Goals / Non-Goals

**Goals:**
- Browser-language detection on first visit (`navigator.language`) with English fallback
- Manual language toggle in the header that switches locale immediately
- `localStorage` persistence so choice survives reloads
- All UI strings (`page.tsx`) translated via `t("key")` lookups
- All validation/generator error codes translated through the same system
- Zero new runtime dependencies — use React context + JSON dictionaries
- Tests assert on error codes instead of literal strings

**Non-Goals:**
- Pluralization rules (not needed for current strings)
- Date/number formatting (not yet needed)
- Route-based i18n (`[lang]/` paths) — incompatible with static export
- Server-side locale resolution — no server
- Runtime dictionary loading — both languages bundled (tiny)

## Decisions

### Decision 1: React Context + JSON dictionaries (vs. i18next / next-intl)

- **Chosen:** Simple React context with JSON dictionaries
- **Alternatives considered:**
  - `i18next` + `react-i18next` — ~30 KB extra bundle for 2 languages and ~70 strings; overkill
  - `next-intl` — designed for SSR + routing; static export requires workarounds that negate its value
  - `next-international` — similar server-side bias
- **Rationale:** The scale is small, there are zero dynamic formatting needs, and a custom context is ~1 KB gzipped with no dependencies. Simpler to audit, simpler to maintain.

### Decision 2: Dictionary files as typed JSON, not plain objects

```
lib/i18n/
├── index.ts          ← I18nProvider, useI18n(), type-safe locale type
├── dictionaries.ts   ← import dicts, export getDictionary(locale)
├── en.json
└── es.json
```

- JSON files keep translations separate from code — non-developers can edit them
- A thin `dictionaries.ts` loader gives type narrowing (`Locale = "es" | "en"`)
- Dictionary shape is flat keys (no nesting) since the string count is small

### Decision 3: Error codes, not error strings, from generators

Current: `throw new Error("El texto no puede superar...")`
Proposed: `throw new AppError("VALIDATION_TEXT_TOO_LONG")` with translation at the UI boundary

- Why: Error strings are also displayed in the UI. If the user switches language, already-thrown errors would show the wrong language. Error codes decouple the message from the generation logic.
- The `lib/i18n/` module exposes a `translateError(code)` function that consumes the active locale's dictionary.
- Since errors are caught in `page.tsx`'s catch block, the translation happens when displaying, not when throwing.

### Decision 4: Language toggle as a `<button>` in the header, next to the existing "Procesamiento local" button

- No dropdown — only 2 languages. A single button with a globe icon or language code (`ES` / `EN`) is cleaner and takes less space.
- Clicking calls `setLocale("en")` / `setLocale("es")` which writes to `localStorage` and triggers a React re-render, updating all `t("key")` strings immediately.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Flash of untranslated content on hard reload | Inline script in `<head>` reads `localStorage` and sets a `lang` attribute before paint (see Next.js "Preventing flash before hydration" guide — same pattern as theme persistence) |
| Translation drift — strings added in one language but not the other | Single source of truth: the keys in `dictionaries.ts`'s type define the contract. Both JSONs must have all keys; CI or type-check can enforce |
| `navigator.language` can return `"en-US"` or `"es-MX"` but we only have `"en"` and `"es"` | Normalize: take the first 2 characters of `navigator.language`, fall back to `"en"` if not `"es"` |
| Error-code refactor touches 3 generator files + 2 test files | Each file is small; the change is mechanical (search/replace patterns), not architectural |