# Feature Specification: Dashboard Visual Redesign

**Feature Branch**: `005-dashboard-redesign`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Research the current frontend dashboard design and come up with ideas to make it more modern and less boring — we need it to look one of a kind"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dark-Themed Sidebar & Navigation Overhaul (Priority: P1)

A developer logs in to TranscodeFlow and is immediately greeted by a premium, dark-themed navigation system that feels distinctive. The sidebar uses a deep, rich gradient background instead of flat black, with a branded logo mark, subtle hover animations on nav links, and a polished user profile section with an avatar placeholder and verification badge. The active page indicator uses an animated accent glow rather than a plain background highlight.

**Why this priority**: The sidebar is the first and most persistent visual element — it sets the tone for the entire product experience. A generic black sidebar feels like a CRUD admin panel; a branded, polished navigation signals "premium developer tool."

**Independent Test**: Can be fully tested by opening the dashboard and verifying the sidebar renders with the new visual treatment (gradient background, glow indicators, animated hovers, branded header with logo). Delivers an immediate "wow" impression on first load.

**Acceptance Scenarios**:

1. **Given** a user visits the login page, **When** the page renders, **Then** the sidebar uses a deep gradient background (not flat #1a1a1a) with a branded product mark beside the "TranscodeFlow" title
2. **Given** a user hovers over a sidebar navigation link, **When** the hover state activates, **Then** a smooth transition with a subtle left-border accent and slight background glow appears
3. **Given** a user is on the Dashboard page, **When** they view the sidebar, **Then** the active link shows an animated accent indicator (colored left border or glow) that distinguishes it from inactive links
4. **Given** a user is authenticated, **When** the sidebar renders, **Then** the user profile section shows a circular avatar placeholder with the user's initials, their email, and a styled verification badge

---

### User Story 2 - Stats Cards with Visual Depth & Micro-Animations (Priority: P1)

A developer views the Dashboard Overview and sees their usage statistics displayed in visually rich cards instead of flat white boxes. Each card has a unique accent color, a subtle gradient or glassmorphism effect, an icon representing the metric, and a smooth count-up animation when the numbers load. The cards use a bento-grid-inspired layout that feels intentional and modern.

**Why this priority**: Stats cards are the primary content element on the dashboard and occupy the most screen real estate. Flat white cards with blue numbers look like every generic admin template — upgrading them delivers the biggest visual impact per effort.

**Independent Test**: Can be fully tested by logging into the dashboard with existing data and verifying that stats cards render with gradient/glass effects, icons, count-up animations, and a bento-grid layout. Delivers measurable visual improvement over the current flat cards.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Dashboard, **When** stats load successfully, **Then** each stat card displays with a distinct accent color, a relevant icon, and a gradient or glassmorphism background effect
2. **Given** stats finish loading, **When** the numbers appear, **Then** values animate from 0 to the actual value with a smooth count-up effect over approximately 1 second
3. **Given** a user hovers over a stat card, **When** the hover state activates, **Then** the card subtly lifts (translateY) and its shadow deepens, providing tactile feedback
4. **Given** the screen is resized below a tablet breakpoint, **When** the cards reflow, **Then** they maintain visual integrity in a stacked or 2-column layout

---

### User Story 3 - Premium Job History Table (Priority: P2)

A developer views the Job History section and sees a polished, modern data table that replaces the current basic bordered table. The table features a frosted-glass header, smooth row hover transitions, animated status badges with subtle pulse effects for active states (processing, transcoding), and expandable detail panels with a smooth slide-down animation. The filter bar uses pill-shaped dropdowns and styled date pickers.

**Why this priority**: The job table is the most complex UI element and where developers spend the most time monitoring jobs. A premium table treatment makes the platform feel professional and purpose-built rather than generic.

**Independent Test**: Can be fully tested by viewing the dashboard with job data, interacting with filters, expanding rows, and verifying animations and hover states. Delivers a polished data-browsing experience.

**Acceptance Scenarios**:

1. **Given** a user views the Job History section, **When** the table renders, **Then** the table header uses a frosted/semi-transparent style, and rows have smooth hover transitions with a subtle highlight
2. **Given** a job has status "processing" or "transcoding", **When** the status badge renders, **Then** it displays a gentle pulse animation to indicate active processing
3. **Given** a user clicks a table row, **When** the expanded detail panel opens, **Then** it slides down smoothly with an ease-out animation rather than instantly appearing
4. **Given** a user interacts with filter dropdowns, **When** selecting a filter value, **Then** the dropdowns are styled as pill-shaped selectors with rounded corners and subtle borders, matching the overall premium aesthetic

---

### User Story 4 - Global Color Palette & Typography Upgrade (Priority: P1)

The entire dashboard transitions from the current muted Bootstrap-inspired color scheme (flat #007bff blue, #1a1a1a black sidebar, #f4f7f6 page background) to a curated, modern palette that feels distinctive. The new palette uses deep, warm dark tones for the sidebar, soft off-white or very light gray for the content area, a vibrant but refined accent color (e.g., electric indigo or teal-cyan gradient), and modern typography from Google Fonts (Inter or similar). All colors are defined as design tokens in the theme system.

**Why this priority**: Color and typography are the foundational elements that define the entire visual identity. No amount of individual component polish matters if the base palette reads as "Bootstrap default." This change ripples across every screen and every component.

**Independent Test**: Can be fully tested by loading any page of the dashboard and verifying the new font family renders, the sidebar gradient uses the new palette, and the accent colors are applied to buttons, links, and interactive elements. Delivers a cohesive, unified visual identity.

**Acceptance Scenarios**:

1. **Given** any page of the dashboard loads, **When** the user inspects the typography, **Then** the body text uses a modern sans-serif font (Inter or equivalent) loaded from a web font provider, not the system font stack
2. **Given** any page of the dashboard loads, **When** the user inspects the color scheme, **Then** the primary accent color is no longer default blue (#007bff) but a distinctive, curated color from the new palette
3. **Given** the design token file is inspected, **When** reviewing the custom properties, **Then** all new colors are defined as named tokens (e.g., --color-accent, --color-surface, --color-surface-raised) following a semantic naming convention
4. **Given** a user views the dashboard on a high-resolution display, **When** the fonts render, **Then** they appear crisp with proper font-weight variations (400 for body, 500 for labels, 600-700 for headings)

---

### User Story 5 - API Key Manager Visual Upgrade (Priority: P2)

A developer views the API Keys section and sees a polished card-based key management interface. Each API key is displayed in its own mini-card with the key prefix in a monospace tag, creation date, and a styled revoke button. The "Create Key" form uses a cohesive input+button combo that matches the new design system. The success alert for newly created keys uses the new accent styling.

**Why this priority**: API key management is a core developer workflow, but currently uses a bare HTML table. Upgrading it to match the premium feel ensures visual consistency across the entire dashboard.

**Independent Test**: Can be fully tested by creating and viewing API keys on the dashboard, verifying the new card layout, styled inputs, and consistent use of the new design tokens. Delivers visual consistency with the rest of the redesigned dashboard.

**Acceptance Scenarios**:

1. **Given** a user views the API Keys section, **When** keys are displayed, **Then** each key appears in a styled card or list item with clear visual separation, monospace prefix display, and a contextual revoke button
2. **Given** a user creates a new API key, **When** the success message appears, **Then** it uses the new accent color scheme with a polished alert design (rounded corners, icon, dismiss button)
3. **Given** a user focuses the "New Key Name" input, **When** the focus ring appears, **Then** it uses the new accent color in the ring/border style, matching the global design system

---

### User Story 6 - Auth Pages Visual Consistency (Priority: P3)

A developer visiting the Login, Register, Forgot Password, or Verify Email pages sees auth forms that match the redesigned dashboard's visual language. The auth card uses the new typography, color palette, and subtle background treatment (e.g., a faint gradient or pattern behind the centered card) so the transition from auth to dashboard feels seamless.

**Why this priority**: Auth pages are the first touchpoint but are viewed infrequently after initial setup. Ensuring they use the same design system guarantees brand consistency but is lower priority than the dashboard itself.

**Independent Test**: Can be fully tested by visiting all auth pages (login, register, forgot-password, reset-password, verify-email) and verifying they use the new font, color tokens, and card styling. Delivers seamless brand consistency.

**Acceptance Scenarios**:

1. **Given** a user visits the login page, **When** the page renders, **Then** the auth card uses the new typography, accent colors, and button styling from the redesigned dashboard
2. **Given** a user visits the register page, **When** the page renders, **Then** the background behind the auth card has a subtle visual treatment (gradient, pattern, or noise texture) rather than flat gray

---

### Edge Cases

- What happens when stats fail to load? → The stat cards should display a graceful error state with a retry option, styled consistently with the new design system
- How does the dashboard look with zero jobs? → The empty state should display a composed icon from the approved icon set (Lucide/Heroicons) styled with accent colors, accompanied by a clear call-to-action text — no custom illustrations required
- What happens on very slow connections? → Loading states (skeletons, spinners) should use the new accent colors and animations, maintaining the premium feel during data fetching
- How does the layout handle extremely long email addresses in the sidebar? → The email display should truncate with ellipsis and show the full address on hover/tooltip

## Clarifications

### Session 2026-04-09

- Q: How should the empty-state illustration for zero-jobs be provided? → A: Composed icon from Lucide/Heroicons with styled text and accent colors (no custom illustrations)
- Q: What font-display strategy should the Google Fonts import use? → A: font-display: swap (show fallback text immediately, swap when font loads)
- Q: Is the 768px–1024px viewport range supported or out of scope? → A: Best-effort — functional with no layout breaks, but no dedicated tablet breakpoint or pixel-perfect testing
- Q: How should SC-002 ("visually distinct from Bootstrap defaults") be validated? → A: Manual before/after screenshot comparison reviewed and approved by stakeholder
- Q: Should animations be completely disabled or reduced when prefers-reduced-motion is active? → A: Reduce to crossfade/opacity-only transitions (no translateY, slides, or pulse — but fades still apply)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The design system MUST define all colors, shadows, border radii, spacing, and typography as reusable design tokens in the theme configuration
- **FR-002**: All interactive elements MUST have visible hover, focus, and active states with smooth transitions (200-300ms duration)
- **FR-003**: The sidebar navigation MUST display an animated active-state indicator for the current page
- **FR-004**: Stats cards MUST display an icon and count-up animation when values load
- **FR-005**: Status badges for active job states (processing, transcoding, uploading) MUST display a subtle pulse animation
- **FR-006**: Expanded job detail panels MUST animate open/closed with a smooth slide transition
- **FR-007**: The dashboard MUST load a modern web font (Inter or equivalent) from a CDN or local asset using `font-display: swap` to ensure immediate text rendering with the fallback font stack
- **FR-008**: All pages (auth, dashboard, playground) MUST use the unified design token palette — no hardcoded hex values in component code
- **FR-009**: The redesign MUST NOT alter any existing functionality, API calls, data flows, or routing
- **FR-010**: Loading and error states MUST be styled consistently with the new design system, including skeleton loaders or branded spinners
- **FR-011**: The redesigned UI MUST maintain accessibility standards (minimum 4.5:1 contrast ratio for text, focus indicators for keyboard navigation)
- **FR-012**: All animations MUST respect the user's `prefers-reduced-motion` OS setting by replacing motion-based animations (translateY, slides, pulse) with crossfade/opacity-only transitions — visual state changes remain visible but motion is eliminated

### Key Entities

- **Design Token**: A named CSS custom property defining a visual attribute (color, shadow, spacing, font) used across all components
- **Accent Color**: The primary brand color used for interactive elements, active indicators, and highlights — replaces the current generic blue
- **Surface Color**: Background colors for content areas, cards, and panels — uses a layered system (base, raised, overlay) for depth hierarchy

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of visible pages use the new design token palette with zero hardcoded color values in component files
- **SC-002**: Users perceive the dashboard as visually distinct — validated via a manual before/after screenshot comparison of key pages (dashboard, job history, API keys) reviewed and approved by the stakeholder
- **SC-003**: All interactive elements respond within 300ms with visible hover/focus/active feedback on both mouse and keyboard interaction
- **SC-004**: The dashboard renders correctly on viewports from 1024px to 2560px wide, with no content overflow or layout breaks. Viewports from 768px–1024px are best-effort (functional, no breaks, but not pixel-perfect tested)
- **SC-005**: Zero regressions in existing functionality — all features (auth, job history, API keys, playground) continue to work identically after the redesign
- **SC-006**: Page load time does not increase by more than 500ms compared to the pre-redesign baseline, accounting for web font loading
- **SC-007**: Accessibility audit produces zero critical violations (text contrast below 4.5:1, missing focus indicators, missing ARIA labels on interactive elements)

## Assumptions

- The existing Tailwind CSS v4 design token infrastructure in `index.css` will be extended with new tokens rather than replaced
- The redesign is purely visual (CSS/component markup) — no backend changes, no new API endpoints, no new data requirements
- The Inter font will be loaded from Google Fonts CDN using `font-display: swap`; no self-hosting is required for the initial version
- Mobile-responsive layout below 768px is out of scope — the dashboard is primarily a desktop tool for developers. The 768px–1024px range is best-effort (functional, no dedicated breakpoint)
- The Playground page layout (form/preview split) will receive the new color palette and typography but its structural layout is not redesigned in this feature
- Browser support targets modern evergreen browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- Icons will use inline SVGs or a lightweight icon set (Lucide, Heroicons); no heavy icon font libraries will be introduced
