## Why

The app currently hardcodes dark mode with no user control over appearance. Language switching is buried in its own modal, while the privacy badge takes header space that could be cleaner. A single settings panel where users control both language and theme makes the interface more modern, accessible, and consistent.

## What Changes

- **Theme system**: Add user-selectable theme (Dark / Light / System) with Dark as default. Persist choice in `localStorage`. "System" mode follows the OS `prefers-color-scheme` media query live.
- **CSS transitions**: Smooth transitions between themes, applied only after initial page load (no flash on hydration).
- **Anti-flash inline script**: Extended to read `blobspawn-theme` from `localStorage` and apply the correct `dark` class before first paint.
- **Privacy badge relocation**: The "Local processing" badge moves from the header bar to a position below the headline/description section, before the search component.
- **Settings modal**: Replace the standalone language toggle button (`🌐`) with a settings button (`⚙️`). The settings modal contains two select fields: Language and Theme. Changes apply and save to `localStorage` immediately.
- **i18n keys**: Rename `header.localProcessing*` → `badge.localProcessing*`. Add new keys for the settings modal and theme labels.
- **Remove**: Standalone language selection dialog, hardcoded `dark` class on `<html>`.

## Capabilities

### New Capabilities
- `theme-settings`: Theme management (dark/light/system persistence, live OS tracking, transitions) and consolidated settings modal (language + theme selectors).

### Modified Capabilities
None — existing generator behavior and requirements are unchanged.

## Impact

- **`app/layout.tsx`**: Extend anti-flash inline script to handle theme. Remove hardcoded `dark` class.
- **`app/globals.css`**: Add transition rules scoped to a `.theme-transition` class.
- **`app/page.tsx`**: Move privacy badge position, replace language button with settings button, remove language dialog, add settings dialog.
- **`lib/theme/index.tsx`**: New `ThemeProvider` component and `useTheme` hook.
- **`lib/i18n/en.json` & `es.json`**: Rename keys, add theme/settings strings.
- No new dependencies.