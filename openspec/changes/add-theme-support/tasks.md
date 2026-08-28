## 1. Theme infrastructure

- [x] 1.1 Create `lib/theme/index.tsx` with `ThemeProvider` and `useTheme` hook that supports `dark`, `light`, `system` themes, persists to `blobspawn-theme` in localStorage, and listens to `matchMedia('prefers-color-scheme: dark')` when in system mode. Verify `theme`, `setTheme`, and `resolvedTheme` behave correctly via the hook.
- [x] 1.2 Add `ThemeProvider` to `app/providers.tsx` alongside `I18nProvider`. Verify both providers wrap the app without errors.
- [x] 1.3 Add `.theme-transition` CSS rules to `app/globals.css` targeting color, background, and border transitions, scoped so they only activate on post-load changes. Verify the live page shows smooth transitions when toggling theme and no transition flash on initial load.

## 2. Anti-flash and initial theme

- [x] 2.1 Remove hardcoded `className="dark"` from `<html>` in `app/layout.tsx`. Extend the inline `<script>` to read `blobspawn-theme` from localStorage and apply/remove the `dark` class before first paint, defaulting to dark when no value is stored. Verify by reloading with each theme stored in localStorage and confirming the correct theme class is present before any visible rendering.
- [x] 2.2 Have `ThemeProvider` add `class="theme-transition"` to `<html>` after first hydration to activate CSS transitions only post-load. Verify transitions are inactive on first paint and activate immediately after hydration.

## 3. Settings modal

- [x] 3.1 Replace the language toggle button (`🌐 <span>EN</span>`) in the header with a settings gear button using `Settings` (or `Gear`) icon from `lucide-react`. Verify the button renders with a gear icon.
- [x] 3.2 Create a settings `<Dialog>` modal alongside the existing dialogs in `app/page.tsx`. The modal contains a title (`t("settings.title")`), a Language `<Select>` with both locale options, and a Theme `<Select>` with dark/light/system options. Both selects apply their changes immediately via `onValueChange`. Verify the modal opens, both selects function, and the interface updates instantly on selection.
- [x] 3.3 Remove the existing `isLangOpen` dialog and its associated button state. Verify the language dialog no longer appears and language switching works exclusively through the settings modal.
- [x] 3.4 Persist theme changes: verify `blobspawn-theme` is written to localStorage on selection and read correctly on reload. Verify `blobspawn-locale` still persists alongside it.

## 4. Privacy badge relocation

- [x] 4.1 Move the privacy badge (`ShieldCheck` + `t("header.localProcessing")`) from the `<header>` flex row to a position below the `home.description` paragraph and above the search `Command` component. Click behavior (opens privacy dialog) remains unchanged. Verify the badge appears between the description text and the search input, and opens the privacy dialog on click.

## 5. i18n updates

- [x] 5.1 Rename `header.localProcessing` → `badge.localProcessing` and `header.localProcessingAria` → `badge.localProcessingAria` in both `en.json` and `es.json`. Update the reference in `page.tsx`. Verify the badge still displays correctly after the rename.
- [x] 5.2 Add settings modal i18n keys to both locale files: `settings.title`, `settings.language`, `settings.theme`, `settings.theme.dark`, `settings.theme.light`, `settings.theme.system`. Wire them into the settings dialog. Verify the modal displays the correct translations for each locale.

## 6. Testing

- [x] 6.1 Run `npm test` to confirm all existing tests still pass.
- [x] 6.2 Run `npm run build` to confirm the static export builds without errors with the new theme and settings code.
- [x] 6.3 Run `npm run lint` to confirm no linting issues.