## Context

The app is a single-page Next.js 16 static export. Dark mode is currently hardcoded via `className="dark"` on `<html>` in `app/layout.tsx`. CSS variables for both light (`:root`) and dark (`.dark`) are already defined in `app/globals.css`. The i18n system uses a React context provider (`I18nProvider` + `useI18n`). Language switching currently has its own dedicated dialog.

See proposal.md for motivation; see spec for requirements.

## Goals / Non-Goals

**Goals:**
- A `ThemeProvider` context hook (`useTheme`) parallel to the existing `I18nProvider` pattern
- Three distinct theme states persisted in localStorage: `dark`, `light`, `system`
- Real-time OS theme tracking via `matchMedia` when in `system` mode
- Anti-flash script extended so the correct theme class is present before hydration
- CSS transitions on theme change, activated only post-load
- Settings modal with dropdown Selects for language and theme
- Privacy badge moved below the headline section

**Non-Goals:**
- Custom theme colors or accent customization — only dark/light/system
- Animations beyond basic CSS transitions (no staggered reveals)
- Changes to the privacy dialog content — only its trigger badge position

## Decisions

### Decision: ThemeProvider follows I18nProvider pattern
A new `lib/theme/index.tsx` file exports `ThemeProvider` + `useTheme`. The provider wraps the app in `app/providers.tsx` alongside `I18nProvider`. The hook returns `{ theme, setTheme, resolvedTheme }`. This keeps the theming code self-contained and follows the existing context convention.

### Decision: Dark as default, persisted as "system"
When no `blobspawn-theme` exists in localStorage, the default is `"dark"` (not `"system"`). The internal `resolvedTheme` logic: `system` resolves via `matchMedia`, `dark` always resolves to dark, `light` to light. The UI default option defaults to the stored value, falling back to `"dark"`.

### Decision: Anti-flash script reads theme before hydration
The existing inline script in `layout.tsx` already sets `<html lang="...">` from localStorage. It will also check `blobspawn-theme` and toggle the `dark` class accordingly before React hydrates. The `dark` class is removed from the JSX static markup — the script is the sole authority on initial theme.

### Decision: CSS transitions via a `.theme-transition` class
After first hydration, the `ThemeProvider` adds `class="theme-transition"` to `<html>`. The CSS in `globals.css` targets `.theme-transition *` with `transition: background-color 0.3s, color 0.3s, border-color 0.3s`. This avoids flash on load where the transition would animate from an un-themed state.

### Decision: matchMedia listener for system mode
When `theme === "system"`, the provider adds a `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` listener. On change, it toggles the `dark` class without updating localStorage (the user's choice is still "system"). The listener is cleaned up on unmount or when the user switches away from "system".

### Decision: Select component for both fields
Language and theme are both rendered as `<Select>` from the UI library, consistent with the existing `pdfMode` selector pattern. Changes fire `onValueChange` immediately.

### Decision: Remove standalone language dialog
The `isLangOpen` dialog is removed entirely. Its replacement is the settings modal. The language button (`🌐`) is replaced by a gear icon (`⚙️` or `Settings` icon from lucide-react).

### Decision: Privacy badge moved to section between description and search
The badge moves from the `<header>` flex row to inside the `<section className="space-y-8">`, placed right after the `home.description` paragraph and before the search `Command` component.

## Risks / Trade-offs

- **[Risk] matchMedia listener leaks** → The provider cleans up the listener on `theme` change and on unmount via `useEffect` return.
- **[Risk] Transition on element added post-hoc** → `.theme-transition` applies to `*`, so dynamically added elements also transition. Acceptable — no added elements have theme-independent colors.
- **[Trade-off] No SSR theme match** → Since it's a static export (`output: "export"`), no SSR. The anti-flash script is the universal mechanism; there is no server to negotiate with.
- **[Trade-off] Two providers in the tree** → `I18nProvider` and `ThemeProvider` are siblings wrapped in `Providers`. No nesting or ordering dependency between them.