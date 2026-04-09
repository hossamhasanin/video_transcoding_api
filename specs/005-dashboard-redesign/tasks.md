# Tasks: Dashboard Visual Redesign

**Input**: Design documents from `/specs/005-dashboard-redesign/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-design-system.md ✓

**Tests**: Not requested in the feature specification. No test tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. User Story 4 (Color Palette & Typography) is promoted to the Foundational phase because it defines the design tokens that ALL other stories depend on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install new dependency and prepare the font loading infrastructure

- [x] T001 Install `lucide-react` dependency in `frontend/package.json`
- [x] T002 [P] Add Google Fonts `<link>` tags with `preconnect` hints for Inter (weights 400, 500, 600, 700) with `display=swap` in `frontend/index.html`

---

## Phase 2: Foundational — Design Token System (User Story 4: Global Color Palette & Typography — P1)

**Purpose**: Define the complete design token system that ALL other stories consume. This is the backbone of the redesign — no component work can begin until these tokens exist.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Goal**: Replace the Bootstrap-inspired palette with the curated indigo-based design token system and apply Inter font globally

**Independent Test**: Load any page of the dashboard and verify Inter renders, accent colors are indigo (not blue), and the `@theme {}` block contains all semantic tokens from the data model

- [x] T003 Replace existing color tokens and add all new design tokens (color, shadow, typography) in the `@theme {}` block in `frontend/src/index.css` — token list per data-model.md: `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-accent-glow`, `--color-surface`, `--color-surface-raised`, `--color-surface-overlay`, `--color-sidebar-from`, `--color-sidebar-to`, `--color-sidebar-active`, `--color-sidebar-hover`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-border`, `--color-border-subtle`, `--shadow-card`, `--shadow-card-hover`, `--shadow-auth-card`, `--shadow-glow`, `--font-sans`
- [x] T004 Add animation keyframes (`pulse-soft`, `slide-down`) and `prefers-reduced-motion` media query rules in `frontend/src/index.css` — motion animations opt-in only under `@media (prefers-reduced-motion: no-preference)`; default is opacity/crossfade only
- [x] T005 [P] Create the `useCountUp` hook in `frontend/src/hooks/useCountUp.ts` — signature: `useCountUp(target: number, durationMs?: number): number`; uses `requestAnimationFrame` with easeOutCubic interpolation; respects `prefers-reduced-motion` by snapping to target immediately; cleans up animation frame on unmount/target change

**Checkpoint**: Foundation ready — all design tokens, animations, reduced-motion rules, and the count-up hook are in place. Component-level redesign can now proceed.

---

## Phase 3: User Story 1 — Dark-Themed Sidebar & Navigation Overhaul (Priority: P1) 🎯 MVP

**Goal**: Transform the sidebar from a flat black panel into a premium dark-themed navigation with gradient background, glow active indicators, animated hover states, branded logo, and user avatar with initials

**Independent Test**: Open the dashboard after login and verify the sidebar renders with a deep indigo gradient background, a logo mark beside "TranscodeFlow," animated glow on the active nav link, smooth hover transitions on all nav links, and a circular initials avatar in the user profile section

### Implementation for User Story 1

- [x] T006 [US1] Redesign the sidebar layout in `frontend/src/App.tsx` — replace flat sidebar background with gradient `bg-gradient-to-b from-sidebar-from to-sidebar-to`; add a Lucide icon (`Zap` or `Play`) beside "TranscodeFlow" branding; replace plain nav link styling with `text-white/80 rounded-lg px-3 py-2.5` default, `bg-sidebar-hover text-white` hover, and `bg-sidebar-active border-l-2 border-accent` + accent glow for active state; add Lucide icons to each nav link (e.g., `LayoutDashboard`, `Key`, `Beaker`/`FlaskConical`)
- [x] T007 [US1] Add user avatar and profile section in `frontend/src/App.tsx` — create a circular avatar (`w-9 h-9 rounded-full bg-accent text-white`) displaying the user's first initial (derived from email); display email with ellipsis truncation for long addresses; add a styled verification badge; update Sign Out button to `bg-white/10 hover:bg-white/15 rounded-lg`

**Checkpoint**: Sidebar is fully redesigned. The dashboard immediately looks premium on first load. Stories 2–6 can proceed.

---

## Phase 4: User Story 2 — Stats Cards with Visual Depth & Micro-Animations (Priority: P1)

**Goal**: Replace flat white stat cards with glassmorphism cards featuring unique accent colors, Lucide icons, count-up animations, hover lift effects, and a responsive bento-grid layout

**Independent Test**: Log into the dashboard with existing data. Verify all 5 stat cards render with: glassmorphism background, correct Lucide icon per stat, card-specific accent color, count-up animation from 0 to actual value (~1s), hover lift (-translateY-1) with shadow deepening, and responsive grid reflow at narrower viewports

### Implementation for User Story 2

- [x] T008 [US2] Redesign the stats cards section in `frontend/src/pages/Dashboard.tsx` — replace `flex gap-5 flex-wrap` with CSS Grid `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`; apply glassmorphism to each card (`bg-surface-overlay backdrop-blur-sm border border-white/20 rounded-xl`); add hover effect (`hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200`); add a 40×40 icon container with stat-specific accent color and Lucide icon per card (Total Jobs → `Briefcase`/Indigo, Completed → `CheckCircle2`/Emerald, Failed → `AlertCircle`/Rose, Storage Used → `HardDrive`/Amber, Processed Time → `Clock`/Cyan); wire `useCountUp` hook to animate numeric values; display labels as `text-sm text-text-secondary`
- [x] T009 [US2] Style error and empty states in `frontend/src/pages/Dashboard.tsx` — graceful error state with retry button using accent styling; empty/zero state with composed Lucide icon and call-to-action text; loading skeleton cards using accent-tinted placeholders

**Checkpoint**: Dashboard overview is fully redesigned with glassmorphism stats cards, animations, and icons.

---

## Phase 5: User Story 3 — Premium Job History Table (Priority: P2)

**Goal**: Transform the basic bordered job table into a premium data-browsing experience with a frosted-glass header, animated status badges, smooth slide-down detail panels, and pill-shaped filter selectors

**Independent Test**: View the dashboard with job data. Verify: frosted/semi-transparent table header, smooth row hover transitions, pulse animation on active status badges (processing/transcoding/uploading), slide-down animation on row expansion, pill-shaped filter dropdowns, and accent-styled pagination

### Implementation for User Story 3

- [x] T010 [US3] Redesign the job history table container and header in `frontend/src/components/JobHistory.tsx` — wrap table in `bg-surface-raised rounded-xl border border-border overflow-hidden`; apply frosted header styles `backdrop-blur-sm bg-white/80 sticky top-0` with `text-xs font-semibold text-text-secondary uppercase tracking-wider`; add row hover `hover:bg-accent-soft transition duration-150`
- [x] T011 [US3] Restyle status badges in `frontend/src/components/JobHistory.tsx` — active states (processing, transcoding, uploading) receive `animate-pulse-soft` CSS class; terminal states (completed, failed, cancelled) remain static; all badges use semantic color tokens (e.g., emerald for completed, rose for failed, amber for processing)
- [x] T012 [US3] Add slide-down animation to expanded job detail panels in `frontend/src/components/JobHistory.tsx` — apply `animate-slide-down` keyframe class to expanded row content; add accent left-border to expanded panel; degrade to opacity fade under `prefers-reduced-motion`
- [x] T013 [US3] Restyle filter bar and pagination in `frontend/src/components/JobHistory.tsx` — filter selects as pill-shaped `rounded-full border-border px-3 py-1`; date pickers with rounded style; active pagination button `bg-accent text-white rounded-lg`; inactive pagination `text-text-secondary hover:bg-accent-soft`

**Checkpoint**: Job History table is fully redesigned with premium data-browsing experience.

---

## Phase 6: User Story 5 — API Key Manager Visual Upgrade (Priority: P2)

**Goal**: Replace the plain HTML API key table with a card-based layout featuring monospace key prefix tags, styled inputs with accent focus rings, and polished success/error alerts

**Independent Test**: Navigate to the API Keys section, create a new key, and verify: card-based key list layout, monospace prefix display, accent-colored focus ring on the input, styled create button, polished success alert with accent colors, and contextual revoke button styling

### Implementation for User Story 5

- [x] T014 [US5] Redesign the API Key Manager layout in `frontend/src/components/ApiKeyManager.tsx` — wrap in `bg-surface-raised rounded-xl border border-border p-6`; replace table with vertical card/list layout: each key as a row with `border-b border-border-subtle`; display key prefix in `font-mono text-sm bg-accent-soft text-accent rounded px-2 py-0.5`; style revoke button as `bg-danger/10 text-danger hover:bg-danger/20 rounded-lg`
- [x] T015 [US5] Restyle the key creation form and alerts in `frontend/src/components/ApiKeyManager.tsx` — input with `focus:ring-2 focus:ring-accent focus:border-accent rounded-lg`; create button as `bg-accent hover:bg-accent-hover text-white rounded-lg`; success alert as `bg-accent-soft border border-accent/20 text-accent rounded-lg` with a Lucide icon and dismiss button; error alert styled consistently with danger tokens

**Checkpoint**: API Key Manager is fully redesigned with card-based layout matching the premium dashboard aesthetic.

---

## Phase 7: User Story 6 — Auth Pages Visual Consistency (Priority: P3)

**Goal**: Update all auth pages to use the new design system typography, color tokens, and card styling so the transition from auth to dashboard is seamless

**Independent Test**: Visit all auth pages (login, register, forgot-password, reset-password, verify-email) and verify: Inter font renders, auth card uses new styling (`rounded-2xl shadow-auth-card`), accent colors on buttons and links, subtle background treatment (gradient or pattern) behind the centered card

### Implementation for User Story 6

- [x] T016 [P] [US6] Restyle the Login page in `frontend/src/pages/auth/Login.tsx` — apply `bg-surface` page background with subtle gradient overlay; auth card with `bg-surface-raised rounded-2xl shadow-auth-card p-10`; heading `text-text-primary text-2xl font-bold`; inputs with `border-border focus:border-accent focus:ring-2 focus:ring-accent-glow rounded-lg`; submit button `bg-accent hover:bg-accent-hover text-white rounded-lg`; links `text-accent hover:text-accent-hover`
- [x] T017 [P] [US6] Restyle the Register page in `frontend/src/pages/auth/Register.tsx` — same auth card treatment as Login; add subtle background visual treatment (gradient or noise pattern); all form elements use accent tokens
- [x] T018 [P] [US6] Restyle the ForgotPassword page in `frontend/src/pages/auth/ForgotPassword.tsx` — same auth card and background treatment; accent-styled submit button and input focus states
- [x] T019 [P] [US6] Restyle the ResetPassword page in `frontend/src/pages/auth/ResetPassword.tsx` — same auth card and background treatment; accent-styled submit button and input focus states
- [x] T020 [P] [US6] Restyle the VerifyEmail page in `frontend/src/pages/auth/VerifyEmail.tsx` — same auth card and background treatment; verification status messages use accent or success tokens

**Checkpoint**: All auth pages share the same visual language as the redesigned dashboard.

---

## Phase 8: User Story Supplement — Playground Palette Application (Priority: P2)

**Goal**: Apply the new color palette and typography tokens to the Playground page (structural layout is NOT redesigned)

**Independent Test**: Open the Playground page and verify: Inter font renders, accent colors replace Bootstrap blue on buttons/links, surface tokens are used for backgrounds, no hardcoded hex values remain

### Implementation

- [x] T021 [US-PG] Restyle the Playground page in `frontend/src/pages/Playground.tsx` — replace any remaining hardcoded colors with design token utilities; apply accent colors to interactive elements; use surface tokens for backgrounds; ensure typography uses the new font stack

**Checkpoint**: Playground page uses the unified token palette.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and quality assurance across all user stories

- [x] T022 Verify no hardcoded hex color values remain in any component file under `frontend/src/` — grep for raw hex patterns (`#[0-9a-fA-F]{3,8}`) in `.tsx` files; all colors must reference design tokens via Tailwind utilities
- [x] T023 [P] Verify accessibility: check contrast ratios for all text/background combinations against the 4.5:1 minimum; verify focus indicators (`focus-visible:ring-2 focus-visible:ring-accent`) are present on all interactive elements
- [x] T024 [P] Verify `prefers-reduced-motion` behavior: enable "Reduce motion" in OS settings and confirm count-up snaps, hover lifts are opacity-only, status badges don't pulse, row expansion fades instead of sliding
- [x] T025 [P] Verify responsive layout: resize browser to 768px–1024px range and confirm no layout breaks, stats cards reflow to 2 columns, table remains scrollable
- [x] T026 Run `npm run typecheck` in `frontend/` to verify TypeScript strict mode passes with zero errors
- [x] T027 Run `npm run build` in `frontend/` to verify production build completes successfully
- [x] T028 Run quickstart.md validation checklist — walk through all verification steps in `specs/005-dashboard-redesign/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — **BLOCKS all user stories**
- **User Story 1 — Sidebar (Phase 3)**: Depends on Phase 2; no story dependencies
- **User Story 2 — Stats Cards (Phase 4)**: Depends on Phase 2 (requires `useCountUp` from T005); no story dependencies
- **User Story 3 — Job History (Phase 5)**: Depends on Phase 2; no story dependencies
- **User Story 5 — API Keys (Phase 6)**: Depends on Phase 2; no story dependencies
- **User Story 6 — Auth Pages (Phase 7)**: Depends on Phase 2; no story dependencies
- **Playground (Phase 8)**: Depends on Phase 2; no story dependencies
- **Polish (Phase 9)**: Depends on ALL previous stories being complete

### User Story Dependencies

- **US1 (Sidebar)**: Independent — can start immediately after Phase 2
- **US2 (Stats Cards)**: Independent — can start immediately after Phase 2
- **US3 (Job History)**: Independent — can start immediately after Phase 2
- **US5 (API Keys)**: Independent — can start immediately after Phase 2
- **US6 (Auth Pages)**: Independent — can start immediately after Phase 2; each page is independently parallelizable
- **Playground**: Independent — can start immediately after Phase 2

### Within Each User Story

- Core layout/container changes first
- Component-specific details (badges, animations, filters) second
- Edge cases (error states, empty states) last

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel
- **Phase 2**: T005 (`useCountUp`) can run in parallel with T003/T004 (different file)
- **Phase 3–8**: ALL user story phases can run in parallel after Phase 2 completes (different files)
- **Phase 7**: All 5 auth pages (T016–T020) can run in parallel (different files)
- **Phase 9**: T023, T024, T025 can run in parallel

---

## Parallel Example: After Phase 2

```bash
# All user stories can launch simultaneously (different files):
Task T006: "Redesign sidebar in frontend/src/App.tsx"            [US1]
Task T008: "Redesign stats cards in frontend/src/pages/Dashboard.tsx" [US2]
Task T010: "Redesign job table in frontend/src/components/JobHistory.tsx" [US3]
Task T014: "Redesign API keys in frontend/src/components/ApiKeyManager.tsx" [US5]
Task T016: "Restyle Login page in frontend/src/pages/auth/Login.tsx"     [US6]
Task T021: "Restyle Playground in frontend/src/pages/Playground.tsx"     [US-PG]
```

---

## Implementation Strategy

### MVP First (Sidebar + Stats Cards)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational — all design tokens, animations, useCountUp (T003–T005)
3. Complete Phase 3: User Story 1 — Sidebar (T006–T007)
4. Complete Phase 4: User Story 2 — Stats Cards (T008–T009)
5. **STOP and VALIDATE**: Dashboard overview with premium sidebar + glassmorphism stats cards delivers the biggest visual impact. Take before/after screenshots for SC-002 validation.

### Incremental Delivery

1. Setup + Foundational → Token system ready
2. Add US1 (Sidebar) + US2 (Stats Cards) → **MVP — immediate wow factor**
3. Add US3 (Job History) → Premium data table
4. Add US5 (API Keys) → Visual consistency in key management
5. Add Playground → Palette applied to playground
6. Add US6 (Auth Pages) → Full brand consistency across all pages
7. Polish → Final validation, accessibility, responsiveness

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US4 (Color Palette & Typography) is absorbed into the Foundational phase (Phase 2) because it defines tokens all other stories depend on
- The Playground receives its own mini-phase (Phase 8) since it's mentioned in the spec assumptions but not a formal user story
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- All animations MUST degrade gracefully under `prefers-reduced-motion`
