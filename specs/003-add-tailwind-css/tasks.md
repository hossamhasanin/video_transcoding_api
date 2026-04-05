# Tasks: Add Tailwind CSS Styling Support

**Input**: Design documents from `/specs/003-add-tailwind-css/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: No automated tests — spec explicitly requires manual visual review only (SC-001 clarification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Install & Configure Tailwind)

**Purpose**: Install Tailwind CSS v4 packages and register the Vite plugin. No styling changes yet.

- [X] T001 Install tailwindcss and @tailwindcss/vite as devDependencies by running `npm install -D tailwindcss @tailwindcss/vite` inside frontend/
- [X] T002 Register the tailwindcss() Vite plugin (listed before react()) in frontend/vite.config.ts: add `import tailwindcss from '@tailwindcss/vite'` and add `tailwindcss()` as the first entry in the plugins array

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the global stylesheet with the Tailwind v4 entry point and all custom design tokens. Required before any component migration can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. The app will be temporarily unstyled after T003 — this is expected.

- [X] T003 Replace all content of frontend/src/index.css with the final CSS-first configuration: `@import "tailwindcss"`, `@source "../src/**"`, and the complete `@theme {}` block containing all 18 design tokens (--font-sans, --color-brand, --color-brand-dark, --color-muted, --color-danger, --color-danger-dark, --color-danger-bg, --color-danger-text, --color-success-bg, --color-success-text, --color-warning, --color-warning-text, --color-page-bg, --color-sidebar, --color-sidebar-hover, --color-sidebar-user, --shadow-card, --shadow-auth-card, --max-w-auth) as specified in data-model.md section 3 — no other rules permitted
- [X] T004 Verify Vite dev server starts without CSS errors after replacing frontend/src/index.css, then run `npm run build` from frontend/ to confirm a clean build with no Tailwind-related warnings (quickstart.md Step 4)

**Checkpoint**: Tailwind CSS v4 is installed and configured. All 18 design tokens are available as utility classes (bg-brand, text-danger, shadow-auth-card, max-w-auth, etc.). Component migration can now begin.

---

## Phase 3: User Story 1 — Developer Uses Tailwind in New Components (Priority: P1) 🎯 MVP

**Goal**: Migrate the app shell (App.tsx and ProtectedRoute.tsx) to Tailwind utility classes, proving the integration works end-to-end and restoring visible layout structure for all pages.

**Independent Test**: Run `npm run dev` and navigate to any page — the sidebar, content area, navigation links, user info box, and logout button should render correctly using only Tailwind classes. Adding any Tailwind utility class (e.g., `className="text-brand"`) to any JSX element should apply the corresponding style with no changes to index.css required.

### Implementation for User Story 1

- [X] T005 [US1] Migrate frontend/src/App.tsx — convert inline hydration loading style (`style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}` → `className="flex justify-center items-center h-screen"`) and replace all 10 app shell CSS classes (.layout → `flex min-h-screen font-sans bg-page-bg text-[#333]`, .sidebar → `w-[250px] bg-sidebar text-white p-5 flex flex-col`, sidebar h2 → `mt-0 text-2xl`, sidebar ul → `list-none p-0 flex-1`, sidebar ul li → `mb-2.5`, sidebar ul li a → `text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover`, .user-info → `mb-5 p-3 bg-sidebar-user rounded`, .user-email → `block text-sm text-[#ddd] break-all`, .badge.badge-warning → `inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 bg-warning text-warning-text`, .logout-btn → `mt-auto px-4 py-2 bg-danger text-white border-none rounded cursor-pointer w-full text-sm hover:bg-danger-dark transition-colors`, .content → `flex-1 p-10`) per data-model.md section 4.1
- [X] T006 [P] [US1] Migrate frontend/src/components/ProtectedRoute.tsx — replace inline loading state style (`style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}`) with `className="flex justify-center items-center h-screen"` per data-model.md section 4.4

**Checkpoint**: User Story 1 complete. The app shell renders correctly with Tailwind. Developers can use any Tailwind utility class in any component without touching index.css.

---

## Phase 4: User Story 2 — Existing Auth Pages Retain Visual Appearance (Priority: P2)

**Goal**: Migrate all 5 authentication pages from global CSS class names (.auth-*, .form-group, .auth-btn, etc.) to Tailwind utility classes, preserving visual appearance exactly.

**Independent Test**: Navigate to /login, /register, /forgot-password, /reset-password, and /verify-email. Each page must render with correct card centering, form layout, button styles, and spacing identical to the pre-migration design. Submit an invalid login form — error banner color, padding, and border radius must appear correctly using bg-danger-bg and text-danger-text.

### Implementation for User Story 2

- [X] T007 [P] [US2] Migrate frontend/src/pages/auth/Login.tsx — replace .auth-page → `flex justify-center items-center min-h-[80vh]`, .auth-card → `bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth`, auth-card h1 → `m-0 mb-2 text-[28px] text-sidebar`, .auth-subtitle → `text-[#666] mb-6 text-[15px]`, .auth-error → `bg-danger-bg text-danger-text px-4 py-3 rounded-md mb-5 text-sm`, .form-group → `mb-5`, form-group label → `block mb-1.5 font-medium text-sm text-[#444]`, form-group input → `w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10`, .form-actions-right → `text-right mb-5`, .auth-btn → `w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed`, .auth-link → `text-brand no-underline font-medium hover:underline`, .auth-footer → `text-center mt-6 text-[#666] text-sm` per data-model.md section 4.5
- [X] T008 [P] [US2] Migrate frontend/src/pages/auth/Register.tsx — apply all same .auth-* and .form-group mappings as T007 plus .password-requirements → `mt-2 text-xs`, .req-item → `py-0.5`, .req-met → `py-0.5 text-[#28a745]`, .req-unmet → `py-0.5 text-[#999]`, .field-error → `text-danger text-xs mt-1` per data-model.md section 4.5
- [X] T009 [P] [US2] Migrate frontend/src/pages/auth/ForgotPassword.tsx — apply all .auth-* and .form-group mappings as T007 and convert the `<Link>` element that combines `className="auth-btn"` with inline `style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}` to `className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors"` per data-model.md section 4.5
- [X] T010 [P] [US2] Migrate frontend/src/pages/auth/ResetPassword.tsx — apply all .auth-* and .form-group mappings as T007 plus .field-error → `text-danger text-xs mt-1` and convert all inline Link styles using same pattern as T009 per data-model.md section 4.5
- [X] T011 [P] [US2] Migrate frontend/src/pages/auth/VerifyEmail.tsx — apply all .auth-* and .form-group mappings as T007 and convert all inline Link styles using same pattern as T009 per data-model.md section 4.5

**Checkpoint**: User Story 2 complete. All 5 auth pages render identically to their pre-migration appearance using only Tailwind utility classes. Zero .auth-* CSS class names remain in any auth page file.

---

## Phase 5: User Story 3 — Dashboard and API Key Manager Use Tailwind Styles (Priority: P3)

**Goal**: Replace every inline `style={{}}` prop object in Dashboard.tsx and ApiKeyManager.tsx with Tailwind utility classes, leaving zero inline style props in either component.

**Independent Test**: Run `grep -n 'style={{' frontend/src/pages/Dashboard.tsx frontend/src/components/ApiKeyManager.tsx` — must return no output. Navigate to the dashboard and API key manager pages and verify correct card layout, shadows, stat number styling, error/success banners, table structure, and button appearance.

### Implementation for User Story 3

- [X] T012 [P] [US3] Migrate frontend/src/pages/Dashboard.tsx — delete cardStyle const (background: white, padding: 20px, borderRadius: 8px, boxShadow, flex, textAlign, minWidth → `bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]`), delete statStyle const (fontSize: 24px, fontWeight: bold, color: #007bff → `text-2xl font-bold text-brand`), replace stats wrapper inline style → `flex gap-5 mb-10 flex-wrap`, replace inline error banner style → `bg-danger-bg text-danger-text p-2.5 rounded mb-5` per data-model.md section 4.2
- [X] T013 [P] [US3] Migrate frontend/src/components/ApiKeyManager.tsx — replace all ~15 inline style props: container → `bg-white p-5 rounded-lg shadow-card`, error banner → `bg-danger-bg text-danger-text p-2.5 rounded mb-5`, success banner → `bg-success-bg text-success-text p-2.5 rounded mb-5`, created-key `<code>` → `break-all`, create form → `flex gap-2.5 mb-5`, name input → `p-2 border border-[#ddd] rounded flex-1`, create button → `px-4 py-2 bg-brand text-white border-none rounded` with conditional cursor class, table → `w-full border-collapse`, table header row → `bg-[#f8f9fa] text-left`, `<th>` → `p-3 border-b border-[#ddd]`, `<td>` → `p-3 border-b border-[#ddd]`, empty state `<td>` → `p-3 text-center text-[#666]`, revoke button → `px-3 py-1.5 bg-danger text-white border-none rounded` with conditional cursor class per data-model.md section 4.3

**Checkpoint**: User Story 3 complete. Zero inline `style={{}}` objects remain in Dashboard.tsx or ApiKeyManager.tsx. Both pages render correctly with Tailwind utility classes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation confirming all success criteria (SC-001 through SC-005) are met.

- [X] T014 Verify frontend/src/index.css contains ONLY `@import "tailwindcss"`, `@source "../src/**"`, and the `@theme {}` block with no other rules (SC-004); inspect the file contents manually and confirm compliance
- [X] T015 [P] Verify zero inline `style={{` attributes remain in frontend/src/pages/Dashboard.tsx and frontend/src/components/ApiKeyManager.tsx by running `grep -n 'style={{' frontend/src/pages/Dashboard.tsx frontend/src/components/ApiKeyManager.tsx` — both must return no output (SC-003)
- [X] T016 Run final production build from frontend/ with `npm run build` and confirm clean output with no CSS errors or Tailwind-related warnings (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion
  - US1 (Phase 3): Restores app shell visibility; recommended before testing US2/US3 in the browser
  - US2 (Phase 4): Can start after Phase 2; all 5 auth page tasks [P] are independently parallelizable
  - US3 (Phase 5): Can start after Phase 2; both component tasks [P] are independently parallelizable
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on US2 or US3
- **User Story 2 (P2)**: Can start after Phase 2 — independent of US1 migration (US1 restores layout visibility but does not block the auth page migrations themselves)
- **User Story 3 (P3)**: Can start after Phase 2 — independent of US1 and US2

### Parallel Opportunities

- T001 → T002 are sequential (package install must complete before vite.config.ts import is valid)
- T003 → T004 are sequential (index.css must be replaced before build verification)
- T005 and T006 can run in parallel (App.tsx and ProtectedRoute.tsx are separate files)
- T007, T008, T009, T010, T011 can all run in parallel (5 separate auth page files with identical mapping patterns)
- T012 and T013 can run in parallel (Dashboard.tsx and ApiKeyManager.tsx are separate files)
- T014 and T015 can run in parallel (different validation checks against different files)

---

## Parallel Example: User Story 2

```bash
# All 5 auth page migrations can launch simultaneously:
Task: "Migrate Login.tsx auth classes → Tailwind in frontend/src/pages/auth/Login.tsx"
Task: "Migrate Register.tsx auth + password-requirements classes → Tailwind in frontend/src/pages/auth/Register.tsx"
Task: "Migrate ForgotPassword.tsx auth classes + inline Link style → Tailwind in frontend/src/pages/auth/ForgotPassword.tsx"
Task: "Migrate ResetPassword.tsx auth classes + inline Link styles → Tailwind in frontend/src/pages/auth/ResetPassword.tsx"
Task: "Migrate VerifyEmail.tsx auth classes + inline Link styles → Tailwind in frontend/src/pages/auth/VerifyEmail.tsx"
```

## Parallel Example: User Story 3

```bash
# Both component migrations can launch simultaneously:
Task: "Remove cardStyle/statStyle consts + inline error banner → Tailwind in frontend/src/pages/Dashboard.tsx"
Task: "Replace ~15 inline style props → Tailwind in frontend/src/components/ApiKeyManager.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004 — CRITICAL)
3. Complete Phase 3: User Story 1 (T005–T006)
4. **STOP and VALIDATE**: Add a Tailwind class to any JSX element and confirm it applies; verify sidebar, nav, and content area render correctly
5. Proceed to US2 and US3 when ready

### Incremental Delivery

1. Complete Setup + Foundational → Tailwind infrastructure live; tokens defined
2. Complete US1 → App shell + ProtectedRoute migrated; proves end-to-end integration
3. Complete US2 → All 5 auth pages migrated; zero .auth-* class names remaining
4. Complete US3 → All inline styles eliminated; Dashboard and ApiKeyManager fully migrated
5. Complete Polish → Full validation pass; SC-001 through SC-005 confirmed

### Parallel Team Strategy

With multiple developers (once Phase 2 is complete):

- Developer A: User Story 1 (T005–T006)
- Developer B: User Story 2 (T007–T011, all in parallel across 5 files)
- Developer C: User Story 3 (T012–T013)

---

## Notes

- [P] tasks = different files, no incomplete task dependencies in the same phase
- [Story] label maps each task to its user story for traceability
- No automated tests — manual visual review only per spec SC-001 clarification
- The app will be temporarily unstyled after T003 (index.css replaced) until T005 (App.tsx migrated) is complete — this is expected per quickstart.md Step 3
- After T003, any remaining global CSS class selectors (.auth-*, .layout, etc.) are no longer defined — pages lose styling until their own component is migrated; this is part of the single-branch, all-or-nothing migration strategy
- Use `data-model.md` as the authoritative mapping reference for every component migration; all before/after class equivalents are specified there
- Commit after each phase checkpoint to enable clean rollback points
- Final production build (T016) is the definitive SC-005 check; run it last
