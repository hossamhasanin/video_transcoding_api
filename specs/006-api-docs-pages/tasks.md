# Tasks: API Documentation Pages

**Input**: Design documents from `/specs/006-api-docs-pages/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted. Run `npm test` and `npm run build` in Polish phase for verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (frontend only)**: `frontend/src/` from repository root
- All paths below are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and add design tokens needed by documentation components

- [x] T001 Create directory structure: `frontend/src/components/docs/` and `frontend/src/data/docs/`
- [x] T002 [P] Add cURL syntax color tokens (`--color-curl-command`, `--color-curl-flag`, `--color-curl-url`, `--color-curl-header-value`, `--color-curl-string`) to `@theme {}` block in `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Define all TypeScript interfaces (`DocSection`, `EndpointEntry`, `ParamEntry`, `CodeExample`, `DocsConfig`, `GettingStartedSection`, `GettingStartedStep`) and type unions (`HttpMethod`, `AuthType`, `ParamLocation`, `CodeLanguage`) in `frontend/src/data/docs/types.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Browse API Documentation (Priority: P1) 🎯 MVP

**Goal**: Developer clicks "Documentation" in the sidebar, lands on a documentation hub with a clear introduction, organized section headings, and Getting Started guide.

**Independent Test**: Navigate to `/docs` and verify: page renders with Getting Started content, all section headings are visible, "Documentation" sidebar link is active, browser tab shows correct title, SEO meta tags are present in page source.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create page metadata (title, description, Open Graph tags) in `frontend/src/data/docs/meta.ts`
- [x] T005 [P] [US1] Create Getting Started section data (account creation, API key generation, first transcoding job steps with code examples) in `frontend/src/data/docs/getting-started.ts`
- [x] T006 [P] [US1] Implement `useDocumentHead` hook (sets `document.title` on mount, restores on unmount) in `frontend/src/hooks/useDocumentHead.ts`
- [x] T007 [US1] Implement `SectionHeading` component (`<h2>` with `id` attribute, lucide icon, description, hover anchor link) in `frontend/src/components/docs/SectionHeading.tsx`
- [x] T008 [US1] Create initial data barrel export (re-export meta + Getting Started + empty sections array) in `frontend/src/data/docs/index.ts`
- [x] T009 [US1] Implement `ApiDocs` page component with `useDocumentHead`, Getting Started content rendering, and section heading placeholders in `frontend/src/pages/ApiDocs.tsx`
- [x] T010 [US1] Register `/docs` route (public, no `ProtectedRoute`) and add "Documentation" sidebar `NavLink` with lucide `FileText` icon in `frontend/src/App.tsx`
- [x] T011 [P] [US1] Add SEO meta tags (`<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:type">`) to `frontend/index.html`

**Checkpoint**: User Story 1 is fully functional — developers can navigate to `/docs`, see Getting Started content and section headings, browser tab shows "API Documentation — TranscodeFlow"

---

## Phase 4: User Story 2 — Read Endpoint Details (Priority: P1)

**Goal**: Developer views detailed information for every API endpoint — HTTP method, URL path, description, authentication type, parameters, request examples, and response examples — organized by API domain section.

**Independent Test**: Navigate to `/docs`, scroll to the Jobs section, and verify the "Submit a new transcoding job" endpoint displays: POST method badge, `/api/v1/jobs/` path, description, API Key auth indicator, parameter table with all fields, cURL request example, and JSON response example.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create authentication section data (10 endpoints: register, login, refresh, me, profile, change-password, forgot-password, reset-password, verify-email, resend-verification) in `frontend/src/data/docs/authentication.ts`
- [x] T013 [P] [US2] Create jobs section data (7 endpoints: submit, list, get status, cancel, SSE events, HLS stream, webhook deliveries) in `frontend/src/data/docs/jobs.ts`
- [x] T014 [P] [US2] Create uploads section data (3 endpoints: presign, status, cancel) in `frontend/src/data/docs/uploads.ts`
- [x] T015 [P] [US2] Create API keys section data (3 endpoints: list, create, revoke) in `frontend/src/data/docs/api-keys.ts`
- [x] T016 [P] [US2] Create usage statistics section data (1 endpoint: get statistics) in `frontend/src/data/docs/usage.ts`
- [x] T017 [P] [US2] Create webhooks & settings section data (3 endpoints: get webhook config, update webhook config, regenerate webhook secret) in `frontend/src/data/docs/webhooks-settings.ts`
- [x] T018 [US2] Assemble full `DocsConfig` with all sections in priority order in `frontend/src/data/docs/index.ts`
- [x] T019 [P] [US2] Implement `highlightCurl` utility function (~30 lines regex tokenizer mapping to `text-curl-*` classes, following existing `highlightJson` pattern in `frontend/src/utils/jsonUtils.ts`) in `frontend/src/utils/curlHighlight.ts`
- [x] T020 [P] [US2] Implement `ParamTable` component (responsive table with Name, Type, Required/Optional badge, Default, Description columns) in `frontend/src/components/docs/ParamTable.tsx`
- [x] T021 [US2] Implement `CodeBlock` component with syntax highlighting (JSON via existing `highlightJson`, cURL via `highlightCurl` from T019) using `dangerouslySetInnerHTML`, label display, and `<pre>` block in `frontend/src/components/docs/CodeBlock.tsx`
- [x] T022 [US2] Implement `EndpointCard` component (method badge with color coding, path in monospace, auth type indicator, rate limit badge, description, `ParamTable`, request/response `CodeBlock` instances) in `frontend/src/components/docs/EndpointCard.tsx`
- [x] T023 [US2] Integrate all endpoint sections into `ApiDocs` page — iterate `DocsConfig.sections`, render `SectionHeading` + `EndpointCard` list per section in `frontend/src/pages/ApiDocs.tsx`

**Checkpoint**: User Stories 1 AND 2 are fully functional — all 27 endpoints across 6 API domains display complete details with syntax-highlighted code examples

---

## Phase 5: User Story 3 — Navigate Between Documentation Sections (Priority: P2)

**Goal**: Developer can jump between API sections via an in-page sidebar navigation with smooth scrolling, active section highlighting, and URL hash synchronization.

**Independent Test**: Click "Jobs" in the docs sidebar — page smooth-scrolls to the Jobs section, URL updates to `/docs#jobs`, "Jobs" is highlighted in the navigation. On mobile, navigation remains accessible.

### Implementation for User Story 3

- [x] T024 [US3] Implement `useActiveSection` hook (single `IntersectionObserver` with `rootMargin: "0px 0px -60% 0px"`, DOM-ordered tiebreaking, nav-click scroll lock via `scrollTargetRef`, `history.replaceState` hash sync, `location.hash` initialization) in `frontend/src/hooks/useActiveSection.ts`
- [x] T025 [US3] Implement `DocsSidebar` component (vertical section links with lucide icons, active section accent styling, `onSectionClick` handler, sticky positioning) in `frontend/src/components/docs/DocsSidebar.tsx`
- [x] T026 [US3] Integrate `DocsSidebar` and `useActiveSection` into `ApiDocs` page — two-column layout with sticky sidebar left and scrollable content right in `frontend/src/pages/ApiDocs.tsx`
- [x] T027 [US3] Add responsive layout for documentation page — sidebar collapses to horizontal top nav on viewports <768px, content stacks vertically in `frontend/src/pages/ApiDocs.tsx`

**Checkpoint**: User Stories 1, 2, AND 3 are all functional — full documentation with section navigation and scroll-spy

---

## Phase 6: User Story 4 — Copy Code Examples (Priority: P2)

**Goal**: Developer can one-click copy any code example (cURL commands, JSON bodies) to their clipboard with visual "Copied!" feedback.

**Independent Test**: Click the copy button on any code block — button changes to "Copied!" for 2 seconds, clipboard contains the exact raw code content (not HTML). Verify via paste into a text editor.

### Implementation for User Story 4

- [x] T028 [US4] Implement `useCopyToClipboard` hook (`navigator.clipboard.writeText` with `execCommand('copy')` fallback, `idle`/`copied`/`error` status, 2-second auto-reset via `useRef` timer, cleanup on unmount) in `frontend/src/hooks/useCopyToClipboard.ts`
- [x] T029 [US4] Add copy-to-clipboard button to `CodeBlock` component (top-right positioned, visible on hover/focus via `opacity` transition, `aria-live="polite"`, `aria-label` updates, `focus-visible:opacity-100`, "Copied!" feedback state) in `frontend/src/components/docs/CodeBlock.tsx`

**Checkpoint**: User Stories 1–4 are all functional — complete documentation with copy-to-clipboard on all code examples

---

## Phase 7: User Story 5 — Access Documentation Without Authentication (Priority: P3)

**Goal**: Prospective developers can view the full API documentation without logging in, with the "Documentation" sidebar link visible alongside sign-in/create-account links.

**Independent Test**: Log out, navigate directly to `/docs` — all documentation content renders without redirect to login. Sidebar shows "Documentation" link alongside "Sign In" and "Create Account".

### Implementation for User Story 5

- [x] T030 [US5] Verify `/docs` route is registered as a public route (bare `<Route>`, no `ProtectedRoute` wrapper) — adjust if needed in `frontend/src/App.tsx`
- [x] T031 [US5] Ensure "Documentation" sidebar `NavLink` is rendered outside the authenticated-only section, visible to unauthenticated users alongside sign-in and create-account links in `frontend/src/App.tsx`

**Checkpoint**: All user stories (1–5) are independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate quality, consistency, and completeness across all user stories

- [x] T032 [P] Validate responsive layout on viewports 375px–1920px for all documentation components (DocsSidebar, EndpointCard, CodeBlock, ParamTable, SectionHeading)
- [x] T033 [P] Validate UX consistency against established design patterns (`bg-surface-raised rounded-xl border border-border shadow-card` card pattern, sidebar `NavLink` styling, `text-2xl font-bold text-text-primary` section headings)
- [x] T034 Verify TypeScript strict mode compliance and production build succeeds with no errors (`cd frontend && npm run build`)
- [x] T035 Run quickstart.md verification steps (public access, sidebar nav, section navigation, code copy, endpoint details, SEO tags, build)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (directory structure must exist) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (types must exist) — delivers MVP
- **US2 (Phase 4)**: Depends on US1 (page and section headings must exist)
- **US3 (Phase 5)**: Depends on US2 (sections with content must exist for scroll-spy)
- **US4 (Phase 6)**: Depends on US2 (CodeBlock component must exist to add copy button)
- **US5 (Phase 7)**: Depends on US1 (route and sidebar link must exist to verify/adjust)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no cross-story dependencies
- **US2 (P1)**: Depends on US1 (needs ApiDocs page and SectionHeading component)
- **US3 (P2)**: Depends on US2 (needs rendered sections for IntersectionObserver targets)
- **US4 (P2)**: Depends on US2 (needs CodeBlock component to enhance with copy button)
- **US5 (P3)**: Depends on US1 (needs route and sidebar link to verify public access)

### Cross-Story Parallelism

After US2 completes, the following stories can proceed in **parallel** (they modify different files):
- **US3**: `useActiveSection.ts`, `DocsSidebar.tsx`, `ApiDocs.tsx`
- **US4**: `useCopyToClipboard.ts`, `CodeBlock.tsx`
- **US5**: `App.tsx`

### Within Each User Story

- Data files before components that consume them
- Utility functions before components that use them
- Components before page integration
- Individual components can be parallel if they don't depend on each other

### Parallel Opportunities

- **Phase 1**: T001, T002 are independent — run in parallel
- **Phase 3 (US1)**: T004, T005, T006 are parallel (different files); T011 is parallel with T007–T010
- **Phase 4 (US2)**: T012–T017 are all parallel (6 independent data files); T019, T020 are parallel (different files); T012–T017 are parallel with T019, T020
- **Phase 5–7**: US3, US4, US5 can proceed in parallel after US2 completes (different file sets)
- **Phase 8**: T032, T033 are parallel

---

## Parallel Example: User Story 2 (Data Files)

```bash
# Launch all 6 endpoint data files in parallel:
Task: "Create authentication section data in frontend/src/data/docs/authentication.ts"
Task: "Create jobs section data in frontend/src/data/docs/jobs.ts"
Task: "Create uploads section data in frontend/src/data/docs/uploads.ts"
Task: "Create API keys section data in frontend/src/data/docs/api-keys.ts"
Task: "Create usage statistics section data in frontend/src/data/docs/usage.ts"
Task: "Create webhooks & settings section data in frontend/src/data/docs/webhooks-settings.ts"

# In parallel with data files, launch utility + component:
Task: "Implement highlightCurl utility in frontend/src/utils/curlHighlight.ts"
Task: "Implement ParamTable component in frontend/src/components/docs/ParamTable.tsx"
```

## Parallel Example: Post-US2 Stories

```bash
# After US2 checkpoint, launch US3, US4, US5 in parallel:
Task: "Implement useActiveSection hook in frontend/src/hooks/useActiveSection.ts"      # US3
Task: "Implement useCopyToClipboard hook in frontend/src/hooks/useCopyToClipboard.ts"  # US4
Task: "Verify /docs public route and sidebar visibility in frontend/src/App.tsx"        # US5
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (2 tasks)
2. Complete Phase 2: Foundational (1 task)
3. Complete Phase 3: User Story 1 (8 tasks)
4. **STOP and VALIDATE**: Navigate to `/docs`, verify Getting Started content, section headings, sidebar link, SEO tags
5. Deploy/demo if ready — developers already have a documentation reference

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (**MVP — documentation hub with Getting Started**)
3. Add US2 → Test independently → Deploy/Demo (**Full endpoint details for all 27 endpoints**)
4. Add US3 → Test independently → Deploy/Demo (**Section navigation with scroll-spy**)
5. Add US4 → Test independently → Deploy/Demo (**Copy-to-clipboard on all code examples**)
6. Add US5 → Test independently → Deploy/Demo (**Public access for unauthenticated developers**)
7. Polish → Final validation → Ship

### Parallel Team Strategy

With multiple developers after US2 completes:

1. Team completes Setup + Foundational + US1 + US2 together
2. Once US2 checkpoint passes:
   - Developer A: US3 (navigation + scroll-spy)
   - Developer B: US4 (copy-to-clipboard)
   - Developer C: US5 (public access)
3. Stories complete and integrate independently — no cross-story file conflicts

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All content is static TypeScript data — no backend changes, no API calls, no database migrations
- Total endpoints to document: 27 across 6 API domains (Dashboard, Playground, Health excluded per data-model.md)
- Syntax highlighting reuses existing `highlightJson` pattern; adds ~30 lines for `highlightCurl`
