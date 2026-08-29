## Purpose

Users can control the application's appearance (dark, light, or system-following) and customize language in a unified settings panel, with preferences persisted across sessions.

## ADDED Requirements

### Requirement: User-selectable theme
The system SHALL provide three theme options: Dark, Light, and System. Dark SHALL be the default. The chosen theme SHALL persist in `localStorage` and SHALL be applied before the first paint on subsequent visits. System mode SHALL follow the OS `prefers-color-scheme` media query and update the active theme in real time when the OS preference changes.

#### Scenario: Default theme is dark
- **WHEN** the user visits the application for the first time with no stored preference
- **THEN** the system applies the Dark theme

#### Scenario: User selects Light theme
- **WHEN** the user selects "Light" in the theme selector
- **THEN** the system applies the Light theme immediately, stores `blobspawn-theme: "light"` in localStorage, and removes the `dark` class from the document

#### Scenario: User selects System theme
- **WHEN** the user selects "System" in the theme selector
- **THEN** the system stores `blobspawn-theme: "system"` in localStorage and applies the theme matching the OS `prefers-color-scheme` preference, updating in real time when the OS changes

#### Scenario: Theme persists across sessions
- **WHEN** the user reloads or revisits the page after setting a theme
- **THEN** the anti-flash inline script reads `blobspawn-theme` from localStorage and applies the corresponding `dark` class before the first paint

### Requirement: Smooth theme transitions
The system SHALL apply CSS transitions to theme-dependent properties (background, text, border colors) so that switching themes animates smoothly. The transitions SHALL activate only after the initial page load to avoid animation on first paint.

#### Scenario: Theme change animates
- **WHEN** the user selects a different theme after the page has loaded
- **THEN** the affected color properties transition smoothly over a short duration

#### Scenario: No transition on initial load
- **WHEN** the page loads for the first time
- **THEN** the theme is applied instantly without transition animation

### Requirement: Consolidated settings modal
The system SHALL provide a single settings modal accessible from a gear icon button in the header. The modal SHALL contain a language selector and a theme selector, each rendered as a dropdown (Select component). Changes to either setting SHALL be applied and persisted immediately upon selection, without requiring a confirmation action.

#### Scenario: Open settings modal
- **WHEN** the user clicks the settings button (gear icon) in the header
- **THEN** a modal opens displaying the Language and Theme selectors

#### Scenario: Change language in settings
- **WHEN** the user selects a different language from the dropdown in the settings modal
- **THEN** the interface language changes immediately and the selection is persisted in localStorage

#### Scenario: Change theme in settings
- **WHEN** the user selects a different theme from the dropdown in the settings modal
- **THEN** the theme applies immediately and the selection is persisted in localStorage

### Requirement: Privacy badge placement
The system SHALL display the "Local processing" badge below the headline and description text, before the file-type search component. Clicking it SHALL open the privacy explanation dialog.

#### Scenario: Badge is below the headline
- **WHEN** the page renders
- **THEN** the local processing badge appears between the hero description and the search component

#### Scenario: Badge opens privacy dialog
- **WHEN** the user clicks the privacy badge
- **THEN** the existing privacy dialog opens, explaining that all processing happens locally

### Requirement: Theme transitions avoid performance penalties
The system SHALL use CSS-native `transition` properties on color-related CSS variables. The transition class SHALL be added only after initial hydration to prevent flash and unnecessary repaints on load.

#### Scenario: Transitions use CSS only
- **WHEN** the theme changes
- **THEN** the transition is driven entirely by CSS rules without JavaScript animation loops or layout thrashing