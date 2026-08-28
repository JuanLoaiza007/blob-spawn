## 1. i18n Infrastructure

- [ ] 1.1 Create `lib/i18n/en.json` and `lib/i18n/es.json` with all UI keys translated — verify each JSON has identical top-level key set
- [ ] 1.2 Create `lib/i18n/dictionaries.ts` with locale type (`"es" | "en"`) and `getDictionary(locale)` loader — verify `getDictionary("es")` returns Spanish dict and `getDictionary("en")` returns English dict
- [ ] 1.3 Create `lib/i18n/index.ts` with `I18nProvider`, `useI18n()` hook, and `t()` helper — verify `useI18n()` returns locale, setLocale, and t function inside a wrapped component
- [ ] 1.4 Implement locale detection: first-visit reads `navigator.language`, normalizes to `"en"` or `"es"`, reads `localStorage` on subsequent visits, defaults to `"en"` — verify detection logic in a unit test
- [ ] 1.5 Add flash-prevention inline script in `app/layout.tsx` that reads `localStorage` and sets a `lang` attribute before paint — verify no flash on hard reload by inspecting the DOM before React hydrates

## 2. Translate UI Strings (page.tsx)

- [ ] 2.1 Wrap `app/page.tsx` with `I18nProvider` in layout and consume `useI18n()` in the page component — verify `t("key")` returns the expected locale's string
- [ ] 2.2 Replace all ~50 inline Spanish strings in `page.tsx` with `t("key")` calls — verify the page renders identically in Spanish mode and with English strings in English mode
- [ ] 2.3 Add language toggle button to the header (`ES` / `EN`) that calls `setLocale()` — verify clicking switches all visible strings immediately without page reload

## 3. Refactor Error Messages to Error Codes

- [ ] 3.1 Define an `AppError` class or error-code enum in `lib/generators/errors.ts` with all error codes (e.g., `TEXT_TOO_LONG`, `PAGE_COUNT_INVALID`, `PDF_TOO_SMALL`) — verify codes are unique and match the current Spanish error coverage
- [ ] 3.2 Refactor `lib/generators/validation.ts` — replace `throw new Error("...")` with `throw new AppError("CODE")` — verify unit tests pass after updating assertions
- [ ] 3.3 Refactor `lib/generators/pdf.ts` — replace error and throw strings with error codes — verify `pdf.test.ts` assertions pass
- [ ] 3.4 Refactor `lib/generators/pdf-security.ts` — replace warning strings with error-code references — verify `pdf-security.integration.test.ts` assertions pass
- [ ] 3.5 Add error-code-to-string mapping in both locale dictionaries and wire translation in the catch block of `page.tsx`'s `download()` function — verify a simulated error displays the translated message matching the active locale

## 4. Verify and Polish

- [ ] 4.1 Run full test suite (`npm test`) and confirm all tests pass
- [ ] 4.2 Run `npm run build` and verify no type errors or build failures
- [ ] 4.3 Manual smoke test: load page in browser with `en` locale, switch to `es`, reload, verify preference persists and no flash occurs