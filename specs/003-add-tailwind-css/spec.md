# Feature Specification: Add Tailwind CSS Styling Support

**Feature Branch**: `003-add-tailwind-css`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "buddy we need to refactor frontend code to support tailwind as a styling css framework"

## Clarifications

### Session 2026-04-05

- Q: Which Tailwind CSS version should be installed? → A: Tailwind CSS v4 (latest stable, CSS-first config via `@theme {}`, Vite plugin)
- Q: How should custom design values be migrated into the Tailwind v4 theme? → A: `@theme {}` block in global stylesheet — all custom tokens defined there as the single source of truth
- Q: Should automated visual regression testing supplement manual review for SC-001? → A: Manual review only; no automated visual regression tests required
- Q: What CSS qualifies as "legitimately cannot be expressed with utility classes" in SC-004? → A: Keyframe `@keyframes` blocks and complex pseudo-selectors (`:nth-child`, `:has`, etc.) only
- Q: How should Tailwind v4 preflight be reconciled with existing global stylesheet reset/base rules? → A: Audit global stylesheet first; remove or convert any rules conflicting with Tailwind v4 preflight before adding `@import "tailwindcss"`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Uses Tailwind in New Components (Priority: P1)

A developer building or modifying any frontend component can use Tailwind utility classes directly in JSX markup without needing to write or maintain a separate CSS file. The styling system is consistent and predictable across the entire frontend.

**Why this priority**: This is the core value of the refactor — enabling Tailwind-based development going forward. Everything else builds on top of this foundation.

**Independent Test**: Can be fully tested by creating a new component using only Tailwind utility classes and confirming it renders with correct visual styling in the browser without touching any CSS file.

**Acceptance Scenarios**:

1. **Given** a developer adds a Tailwind utility class to any JSX element, **When** the frontend is run, **Then** the style is applied correctly without any additional CSS configuration.
2. **Given** a developer creates a brand-new component using only Tailwind classes, **When** the component is rendered, **Then** it displays the intended visual design without requiring changes to any global stylesheet.
3. **Given** the frontend build process runs, **When** the output is inspected, **Then** only the Tailwind utility classes actually used in the codebase are included (no unused CSS bloat).

---

### User Story 2 - Existing Auth Pages Retain Visual Appearance (Priority: P2)

All authentication pages (Login, Register, Forgot Password, Reset Password, Verify Email) continue to render correctly and maintain their existing visual design after the migration from global CSS classes to Tailwind utility classes.

**Why this priority**: Auth flows are user-facing and business-critical. Regressions here directly impact the ability of users to access the system.

**Independent Test**: Can be fully tested by navigating through each auth page and comparing visual output before and after migration, confirming no layout breaks, misaligned elements, or missing styles.

**Acceptance Scenarios**:

1. **Given** the auth pages previously styled via global CSS class names, **When** those styles are replaced with Tailwind equivalents, **Then** all pages render identically to their pre-migration appearance.
2. **Given** a user submits an invalid form on the Login page, **When** the error state is displayed, **Then** error styling (color, spacing, visibility) appears correctly.
3. **Given** a user visits any auth page on a standard desktop viewport, **When** the page loads, **Then** the layout, card centering, and form structure appear intact and unchanged.

---

### User Story 3 - Dashboard and API Key Manager Use Tailwind Styles (Priority: P3)

The Dashboard and API Key Manager components, which currently use inline style objects, are refactored to use Tailwind utility classes. This makes styles visible, auditable, and consistent with the rest of the frontend.

**Why this priority**: Inline styles are harder to maintain, override, and review. This story improves developer experience and code quality, but does not affect end users if deferred.

**Independent Test**: Can be fully tested by reviewing the components and confirming no inline `style` prop objects remain, then visually verifying the Dashboard and API Key Manager render correctly with equivalent styling.

**Acceptance Scenarios**:

1. **Given** the Dashboard component previously used inline style objects for card and stat layouts, **When** those are replaced with Tailwind utility classes, **Then** the visual layout of the Dashboard is preserved.
2. **Given** the API Key Manager component previously used inline styles for its card and form layout, **When** refactored, **Then** all elements maintain correct spacing, sizing, and appearance.
3. **Given** a developer inspects the JSX of either component, **When** they look at styling, **Then** they find only Tailwind utility class strings and no inline `style` prop objects remaining.

---

### Edge Cases

- What happens when a Tailwind utility class conflicts with any remaining global CSS rule? The migrated component must reflect the intended Tailwind style, not the legacy rule.
- How does the system handle components not yet migrated to Tailwind? They must continue to function and display correctly using existing global CSS without breakage.
- What happens if Tailwind's base reset conflicts with existing browser-default overrides already in the global stylesheet? The global stylesheet MUST be audited before `@import "tailwindcss"` is added; any rules that duplicate or conflict with Tailwind v4 preflight are removed or converted to utility classes first, making preflight the sole base reset source.
- Any CSS rule in the global stylesheet that is not a `@keyframes` block, a complex pseudo-selector rule, a `@theme {}` block, or the `@import "tailwindcss"` directive MUST be migrated to Tailwind utility classes and deleted; retaining other rules is not permitted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontend build system MUST integrate Tailwind CSS v4 via the official `@tailwindcss/vite` Vite plugin and be capable of processing Tailwind utility classes, producing a correctly styled output without errors.
- **FR-002**: Developers MUST be able to use any Tailwind utility class in any frontend component file and have that class applied at runtime.
- **FR-003**: All global CSS class-based styles used in authentication pages MUST be replaced with equivalent Tailwind utility classes, producing visually equivalent output.
- **FR-004**: All inline style object-based styles in the Dashboard and API Key Manager components MUST be replaced with equivalent Tailwind utility classes.
- **FR-005**: The global stylesheet MUST use Tailwind CSS v4's `@import "tailwindcss"` entry directive (not the v3 `@tailwind` directives), and all migrated custom CSS rules MUST be removed once replaced by Tailwind classes.
- **FR-006**: The app shell layout (sidebar, main content area) MUST be migrated to Tailwind utility classes without visual regression.
- **FR-007**: No visual regression MUST occur for any user-visible page or component as a result of this migration.
- **FR-008**: The Tailwind configuration MUST be scoped to only the frontend source files to avoid unintended class detection from unrelated directories.

### Key Entities

- **Global Stylesheet**: The single CSS file currently containing all custom styles; serves as the integration point for Tailwind directives and the source of styles to be migrated and removed.
- **Component**: Any frontend file containing JSX markup; the target of Tailwind class application after migration.
- **Inline Style Object**: A typed style value or anonymous style object assigned directly to the `style` prop of a JSX element; these are the primary migration targets in Dashboard and API Key Manager.
- **Tailwind Configuration**: In Tailwind CSS v4, configuration is CSS-first: there is no `tailwind.config.js`; source file scanning is controlled via `@source` directives in CSS and theme customizations are defined in `@theme {}` blocks within the stylesheet. This replaces the v3 JS config model.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All user-visible pages and components render identically before and after migration, with zero visual regressions detected during manual review of every page; no automated visual regression tooling is required.
- **SC-002**: A developer can add a new styled component using only Tailwind utility classes with no changes to any CSS file required.
- **SC-003**: Zero inline `style` prop objects remain in the Dashboard and API Key Manager components after migration.
- **SC-004**: The global stylesheet retains only the `@import "tailwindcss"` entry directive, any `@theme {}` blocks defining custom design tokens, `@keyframes` animation blocks, and complex pseudo-selector rules (e.g., `:nth-child`, `:has`) that have no utility-class equivalent; all other migrated rules are removed.
- **SC-005**: The frontend build completes successfully with no errors or warnings related to styling configuration.

## Assumptions

- The existing visual design is treated as the source of truth; the migration preserves appearance and does not introduce any design changes.
- All frontend source files are located under the `frontend/` directory; the Tailwind v4 configuration uses `@source "./frontend/**"` to scope class detection to only that directory.
- Tailwind v4 preflight is applied automatically via `@import "tailwindcss"`; the global stylesheet MUST be audited before that import is added, with any rules that duplicate or conflict with Tailwind v4 preflight removed or converted to Tailwind utilities first.
- Custom design values (colors, spacing, border radii, shadows) not covered by Tailwind defaults MUST be defined in an `@theme {}` block within the global stylesheet (Tailwind v4 CSS-first approach); the current CSS values serve as the reference.
- The migration is completed in a single feature branch with no partial rollout; all components are migrated before merging.
- No new visual features or design changes are in scope; this is a pure styling infrastructure refactor.
