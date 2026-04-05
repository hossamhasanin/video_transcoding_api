# Tasks: Frontend Modernization — React TypeScript, Zustand & SWR

**Input**: Design documents from `/specs/002-react-ts-refactor/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not included — spec.md explicitly states no automated tests are in scope for this refactor. Acceptance criteria are validated by `npm run build` + manual browser testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

## Path Conventions

All paths are relative to the repository root. Frontend source lives under `frontend/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and create TypeScript/ESLint configuration files. Must complete before any source file conversion can begin.

- [X] T001 Update `frontend/package.json` — add `"zustand": "^5.0.12"` to `dependencies`; add `"@typescript-eslint/parser": "^7.x"` and `"@typescript-eslint/eslint-plugin": "^7.x"` to `devDependencies`; update lint script to `"eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --max-warnings 0"` per research.md section 11
- [X] T002 [P] Create `frontend/tsconfig.json` — strict TypeScript browser config: target ES2020, lib [ES2020, DOM, DOM.Iterable], moduleResolution bundler, jsx react-jsx, strict true, noUnusedLocals true, noUnusedParameters true, noEmit true, include ["src"], references tsconfig.node.json; per research.md section 10
- [X] T003 [P] Create `frontend/tsconfig.node.json` — TypeScript config for `vite.config.ts`: composite true, skipLibCheck true, module ESNext, moduleResolution bundler, allowSyntheticDefaultImports true, strict true, include ["vite.config.ts"]; per research.md section 10
- [X] T004 [P] Create `frontend/vite.config.ts` — import defineConfig from vite and react from @vitejs/plugin-react; export defineConfig({ plugins: [react()] }); per research.md section 10
- [X] T005 [P] Create `frontend/.eslintrc.cjs` — set parser to @typescript-eslint/parser, extend plugin:@typescript-eslint/recommended and plugin:react/recommended, add rules react/react-in-jsx-scope off and react/prop-types off; per research.md section 11
- [X] T006 Update `frontend/index.html` — change the script `src` attribute from `/src/main.jsx` to `/src/main.tsx`; per research.md section 10 (Vite does not fall back on extension)

**Checkpoint**: Config files exist; `npm install` in `frontend/` picks up Zustand and TS ESLint packages

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared TypeScript interfaces and Vite env types that every source file in Phases 3–5 will import. Must complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create `frontend/src/types/index.ts` — export interfaces User (id, email, full_name, email_verified), Tokens (access_token, refresh_token), ApiKey (id, name, key_prefix, created_at), CreateApiKeyResponse (key_value), UsageStats (total_jobs, completed_jobs, failed_jobs, storage_used_bytes, processed_minutes), and AuthState (all fields + all action function signatures); per contracts/component-props.md and data-model.md
- [X] T008 [P] Create `frontend/src/env.d.ts` — add `/// <reference types="vite/client" />`; declare ImportMetaEnv interface with readonly VITE_API_URL string; declare ImportMeta interface with readonly env: ImportMetaEnv; per contracts/component-props.md Vite Environment Types section

**Checkpoint**: Shared types available — all story phases can now begin

---

## Phase 3: User Story 1 — Developer Works with Full Type Safety (Priority: P1) 🎯 MVP

**Goal**: All 12 source files are converted to `.ts`/`.tsx`, the TypeScript compiler runs in strict mode, and `npm run build` completes with zero type errors. No logic changes — only renames and type annotations are added in this phase.

**Independent Test**: Run `npm run build` from `frontend/` → zero TypeScript errors. Run `find frontend/src -name "*.jsx" -o -name "*.js"` → no output (SC-001, SC-002).

### Implementation for User Story 1

- [X] T009 [P] [US1] Convert `frontend/src/api.js` → `api.ts` — import AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, isAxiosError from axios; type the Axios instance as AxiosInstance; type interceptor callbacks; keep existing localStorage.getItem('tokens') token read (updated in T022); import and use Tokens type from ./types/index; per contracts/component-props.md api.ts section
- [X] T010 [P] [US1] Convert `frontend/src/context/AuthContext.jsx` → `AuthContext.tsx` — type all context state fields using User and Tokens from ./types/index; type all auth action function signatures to match AuthState interface; add React.ReactNode type to AuthProvider children prop; keep all existing API call logic unchanged
- [X] T011 [P] [US1] Convert `frontend/src/main.jsx` → `main.tsx` — type the React DOM createRoot call; keep existing AuthProvider wrapper (removed in T024); keep existing render tree structure
- [X] T012 [P] [US1] Convert `frontend/src/App.jsx` → `App.tsx` — annotate component return type as React.ReactElement; type any internal state; keep AuthProvider wrapper (removed in T023); all route definitions unchanged
- [X] T013 [P] [US1] Convert `frontend/src/components/ProtectedRoute.jsx` → `ProtectedRoute.tsx` — type ProtectedRouteProps { children: React.ReactNode }; keep existing useAuth()/useContext logic (updated in T025); annotate return type as React.ReactElement
- [X] T014 [P] [US1] Convert `frontend/src/components/ApiKeyManager.jsx` → `ApiKeyManager.tsx` — type useState hooks (newKeyName: string, createdKey: string|null, loading: boolean, error: string); type fetch response as ApiKey[] and CreateApiKeyResponse using imports from ../types; annotate event handlers; keep existing useEffect fetch pattern (replaced in T035)
- [X] T015 [P] [US1] Convert `frontend/src/pages/Dashboard.jsx` → `Dashboard.tsx` — type useState hooks (stats: UsageStats|null, loading: boolean, error: string); type fetch response as UsageStats using import from ../types; annotate event handlers; keep existing useEffect fetch pattern (replaced in T034)
- [X] T016 [P] [US1] Convert `frontend/src/pages/auth/Login.jsx` → `Login.tsx` — type useState hooks (email, password, error: string; loading: boolean); type form submit event as React.FormEvent<HTMLFormElement>; keep useAuth() calls (updated in T026)
- [X] T017 [P] [US1] Convert `frontend/src/pages/auth/Register.jsx` → `Register.tsx` — type useState hooks; type form event handler; keep useAuth() calls (updated in T027)
- [X] T018 [P] [US1] Convert `frontend/src/pages/auth/ForgotPassword.jsx` → `ForgotPassword.tsx` — type useState hooks; type form event handler; keep useAuth() calls (updated in T028)
- [X] T019 [P] [US1] Convert `frontend/src/pages/auth/ResetPassword.jsx` → `ResetPassword.tsx` — type useState hooks; type useSearchParams usage; type form event handler; keep useAuth() calls (updated in T029)
- [X] T020 [P] [US1] Convert `frontend/src/pages/auth/VerifyEmail.jsx` → `VerifyEmail.tsx` — type useState hooks; type useSearchParams usage; keep useAuth() calls (updated in T030)

**Checkpoint**: `npm run build` produces zero TypeScript errors. All pages load and behave identically to pre-refactor baseline. No `.jsx` or `.js` source files remain in `frontend/src/`.

---

## Phase 4: User Story 2 — Developer Uses Centralized Zustand Store for Auth State (Priority: P2)

**Goal**: `AuthContext` is deleted; all auth state is sourced exclusively from a Zustand `persist` store. The full authentication flow (login, logout, register, session restore) works end-to-end with no React Context Provider in the tree.

**Independent Test**: `grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/` returns no results. Login, logout, and hard-refresh session restore all work in the browser (SC-005).

### Implementation for User Story 2

- [X] T021 [US2] Create `frontend/src/store/authStore.ts` — implement Zustand store using curried `create<AuthState>()((set, get) => ...)` form; use `persist` middleware with `partialize: (s) => ({ user: s.user, tokens: s.tokens })`, `name: 'auth-storage'`, `createJSONStorage(() => localStorage)`, and `onRehydrateStorage: () => (state) => { state?.setHasHydrated(true) }`; implement all nine auth actions (login, register, logout, refreshProfile, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerification) with API calls matching existing AuthContext.jsx logic; export `selectIsAuthenticated` selector `(state) => state.user !== null && state.tokens !== null`; per research.md sections 2–4 and contracts/auth-store.md
- [X] T022 [P] [US2] Update `frontend/src/api.ts` request interceptor — replace `localStorage.getItem('tokens')` JSON.parse with `useAuthStore.getState().tokens`; add `import { useAuthStore } from './store/authStore'`; update the Authorization header logic to `tokens?.access_token`; per research.md section 5 and contracts/component-props.md api.ts section
- [X] T023 [P] [US2] Update `frontend/src/App.tsx` — remove AuthProvider import and wrapper from render tree; add `_hasHydrated` hydration gate via `useAuthStore((s) => s._hasHydrated)` before rendering the Router and sidebar so route evaluation is suspended during localStorage rehydration; per contracts/auth-store.md Outside-React and contracts/component-props.md App section
- [X] T024 [P] [US2] Update `frontend/src/main.tsx` — remove AuthProvider import and `<AuthProvider>` wrapper; the render tree now passes `<App />` (or `<SWRConfig><App /></SWRConfig>`) directly to React root without any Context Provider; per research.md section 12
- [X] T025 [P] [US2] Update `frontend/src/components/ProtectedRoute.tsx` — replace useAuth()/useContext with `useAuthStore((s) => s._hasHydrated)` and `useAuthStore(selectIsAuthenticated)`; render full-page loading spinner when `!hasHydrated`; render `<Navigate to="/login" state={{ from: location }} replace />` when `!isAuthenticated`; render children when authenticated; per contracts/auth-store.md Hydration Gate Pattern
- [X] T026 [P] [US2] Update `frontend/src/pages/auth/Login.tsx` — replace `useAuth()` call with `useAuthStore((s) => s.login)` and `useAuthStore((s) => s.loading)`; remove AuthContext import; per contracts/auth-store.md Backward Compatibility table
- [X] T027 [P] [US2] Update `frontend/src/pages/auth/Register.tsx` — replace `useAuth()` call with `useAuthStore((s) => s.register)` selector; remove AuthContext import; per contracts/auth-store.md
- [X] T028 [P] [US2] Update `frontend/src/pages/auth/ForgotPassword.tsx` — replace `useAuth()` call with `useAuthStore((s) => s.forgotPassword)` selector; remove AuthContext import; per contracts/auth-store.md
- [X] T029 [P] [US2] Update `frontend/src/pages/auth/ResetPassword.tsx` — replace `useAuth()` call with `useAuthStore((s) => s.resetPassword)` selector; remove AuthContext import; per contracts/auth-store.md
- [X] T030 [P] [US2] Update `frontend/src/pages/auth/VerifyEmail.tsx` — replace `useAuth()` calls with `useAuthStore((s) => s.verifyEmail)` and `useAuthStore((s) => s.resendVerification)` selectors; remove AuthContext import; per contracts/auth-store.md
- [X] T031 [US2] Delete `frontend/src/context/AuthContext.tsx` — remove the file; verify deletion is complete by running `grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/` and confirming zero results (SC-005)

**Checkpoint**: Auth flow works end-to-end without any Context Provider. `grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/` is empty. Session restore via hard-refresh shows spinner then Dashboard.

---

## Phase 5: User Story 3 — Developer Fetches Server Data via SWR Hooks (Priority: P3)

**Goal**: All `useEffect`-based data fetching in Dashboard and ApiKeyManager is replaced by SWR hooks. A global `SWRConfig` provider supplies the Axios fetcher. API key create and revoke trigger automatic SWR cache revalidation.

**Independent Test**: Open Dashboard → `GET /usage` fires via SWR with loading indicator. Open ApiKeyManager → `GET /keys` fires via SWR. Create a key → key list updates automatically. Revoke a key → list updates automatically (SC-004, SC-006).

### Implementation for User Story 3

- [X] T032 [P] [US3] Create `frontend/src/hooks/useUsageStats.ts` — implement and export `useUsageStats()` returning `{ stats, error, isLoading }` using `useSWR<UsageStats, AxiosError>('/usage')`; import UsageStats from ../types; import AxiosError from axios; cache key is `'/usage'`; per contracts/swr-hooks.md useUsageStats section
- [X] T033 [P] [US3] Create `frontend/src/hooks/useApiKeys.ts` — export `API_KEYS_CACHE_KEY = '/keys'`; implement `useApiKeys()` with `useSWR<ApiKey[], AxiosError>(API_KEYS_CACHE_KEY)` returning `{ keys: data ?? [], error, isLoading, mutate }`; implement `useCreateApiKey()` with `useSWRMutation<CreateApiKeyResponse, AxiosError, string, { name: string }>(API_KEYS_CACHE_KEY, createKeyFetcher)` using `api.post<CreateApiKeyResponse>('/keys', arg)`; implement `useRevokeApiKey()` with `useSWRMutation<void, AxiosError, string, string>(API_KEYS_CACHE_KEY, revokeKeyFetcher)` using `api.delete(\`/keys/\${arg}\`)`; per contracts/swr-hooks.md useApiKeys section
- [X] T034 [US3] Update `frontend/src/pages/Dashboard.tsx` — remove useState (stats, loading, error) and useEffect fetch; replace with `const { stats, error, isLoading } = useUsageStats()`; render loading indicator when `isLoading`; render error message (`error.response?.data?.detail ?? error.message`) when `error`; render stats when data is present; per contracts/swr-hooks.md error handling pattern and spec.md US3 acceptance scenario 1
- [X] T035 [US3] Update `frontend/src/components/ApiKeyManager.tsx` — remove useState fetch state (keys, loading, error) and useEffect; replace with `useApiKeys()`, `useCreateApiKey()`, `useRevokeApiKey()`; call `triggerCreate({ name: newKeyName })` on form submit and store `data.key_value` in `createdKey` state for one-time display; call `triggerRevoke(key.id)` on revoke; use `isMutating` from both mutation hooks to disable buttons during in-flight requests; per contracts/swr-hooks.md and data-model.md CreateApiKeyResponse note and spec.md US3 acceptance scenarios 3–4
- [X] T036 [P] [US3] Update `frontend/src/main.tsx` — add `import { SWRConfig } from 'swr'`; add `import api from './api'`; define `const axiosFetcher = (url: string) => api.get(url).then((res) => res.data)`; wrap `<App />` with `<SWRConfig value={{ fetcher: axiosFetcher }}>`; per contracts/swr-hooks.md Global SWR Configuration section and research.md section 6

**Checkpoint**: All three stories are independently functional. No `useEffect`-based data fetching remains for `/usage` or `/keys`. API key mutations auto-revalidate the list without page reload.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and lint/build clean-up across all user stories.

- [X] T037 Run `npm run build` from `frontend/` — resolve any remaining TypeScript compilation errors until the build completes with zero errors; do not suppress errors with `@ts-ignore` or `any` casts (FR-009); validates SC-001 and SC-002
- [X] T038 [P] Run `npm run lint` from `frontend/` — resolve any ESLint errors or warnings until lint exits with zero warnings (`--max-warnings 0`); fix noUnusedLocals, noUnusedParameters, and any @typescript-eslint violations
- [X] T039 Execute quickstart.md verification checklist — run all checks from sections 4–10: (1) `find frontend/src -name "*.jsx" -o -name "*.js"` returns empty; (2) `grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/` returns empty; (3) `grep -r "useEffect" frontend/src/pages/Dashboard.tsx frontend/src/components/ApiKeyManager.tsx` returns empty; (4) `grep -r "useSWR" frontend/src/` shows results in Dashboard and ApiKeyManager; (5) full auth flow (login, logout, register, session restore, protected route) works in browser; (6) API key create and revoke auto-refresh the list; validates SC-001 through SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user story phases
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (TypeScript files must exist before logic is refactored)
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion; independent of Phase 4 (touches different files), but main.tsx T036 is cleaner after T024 removes AuthProvider
- **Polish (Phase 6)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no story dependencies
- **US2 (P2)**: Starts after US1 completes — requires typed `.tsx` files to exist before refactoring auth logic
- **US3 (P3)**: Starts after US1 completes — independent of US2 (touches Dashboard/ApiKeyManager; US2 touches auth pages); can run in parallel with US2 with the exception that both modify `main.tsx` (T024 removes AuthProvider; T036 adds SWRConfig — coordinate or sequence)

### Within Each User Story

- **US1**: All T009–T020 are independent file renames — can run fully in parallel
- **US2**: T021 (authStore.ts) MUST complete first; T022–T030 can run in parallel after T021; T031 (delete AuthContext) must be last
- **US3**: T032 and T033 and T036 can run in parallel; T034 depends on T032; T035 depends on T033

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 can run in parallel (4 tasks)
- Phase 2: T007, T008 can run in parallel
- Phase 3: T009–T020 can all run in parallel (12 tasks — all separate files)
- Phase 4: T022–T030 can run in parallel after T021 (9 tasks)
- Phase 5: T032, T033, T036 can run in parallel (3 tasks)
- Phase 6: T037, T038 can run in parallel

---

## Parallel Example: User Story 1

```bash
# All 12 file conversions can be launched together (separate files, no shared state):
Task: "Convert frontend/src/api.js → api.ts"                              # T009
Task: "Convert frontend/src/context/AuthContext.jsx → AuthContext.tsx"    # T010
Task: "Convert frontend/src/main.jsx → main.tsx"                          # T011
Task: "Convert frontend/src/App.jsx → App.tsx"                            # T012
Task: "Convert frontend/src/components/ProtectedRoute.jsx → .tsx"         # T013
Task: "Convert frontend/src/components/ApiKeyManager.jsx → .tsx"          # T014
Task: "Convert frontend/src/pages/Dashboard.jsx → .tsx"                   # T015
Task: "Convert frontend/src/pages/auth/Login.jsx → .tsx"                  # T016
Task: "Convert frontend/src/pages/auth/Register.jsx → .tsx"               # T017
Task: "Convert frontend/src/pages/auth/ForgotPassword.jsx → .tsx"         # T018
Task: "Convert frontend/src/pages/auth/ResetPassword.jsx → .tsx"          # T019
Task: "Convert frontend/src/pages/auth/VerifyEmail.jsx → .tsx"            # T020
```

## Parallel Example: User Story 2 (after T021 completes)

```bash
# After authStore.ts exists, all consumer updates can run in parallel:
Task: "Update frontend/src/api.ts request interceptor"                     # T022
Task: "Update frontend/src/App.tsx (remove AuthProvider, add hydration)"   # T023
Task: "Update frontend/src/main.tsx (remove AuthProvider)"                 # T024
Task: "Update frontend/src/components/ProtectedRoute.tsx"                  # T025
Task: "Update frontend/src/pages/auth/Login.tsx"                           # T026
Task: "Update frontend/src/pages/auth/Register.tsx"                        # T027
Task: "Update frontend/src/pages/auth/ForgotPassword.tsx"                  # T028
Task: "Update frontend/src/pages/auth/ResetPassword.tsx"                   # T029
Task: "Update frontend/src/pages/auth/VerifyEmail.tsx"                     # T030
# Then: T031 (delete AuthContext.tsx + verify)
```

## Parallel Example: User Story 3

```bash
# Create hooks and add SWRConfig provider in parallel:
Task: "Create frontend/src/hooks/useUsageStats.ts"                         # T032
Task: "Create frontend/src/hooks/useApiKeys.ts"                            # T033
Task: "Update frontend/src/main.tsx — add SWRConfig provider"              # T036
# Then:
Task: "Update frontend/src/pages/Dashboard.tsx — use useUsageStats()"      # T034
Task: "Update frontend/src/components/ApiKeyManager.tsx — use SWR hooks"   # T035
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, create config files)
2. Complete Phase 2: Foundational (shared types)
3. Complete Phase 3: User Story 1 (TypeScript conversion)
4. **STOP and VALIDATE**: `npm run build` → zero errors; `find frontend/src -name "*.jsx"` → empty
5. US1 delivers standalone value: type safety across the full codebase before any logic change

### Incremental Delivery

1. Setup + Foundational → typed shell ready
2. US1 (TypeScript) → `npm run build` zero errors — **MVP deliverable**
3. US2 (Zustand) → AuthContext removed, session restore works — deploy/demo
4. US3 (SWR) → data fetching modernized, cache invalidation works — deploy/demo
5. Each story is independently verifiable and does not regress the previous stories

### Parallel Team Strategy

With two developers after Phase 3 completes:
- Developer A: User Story 2 (auth store + all auth pages)
- Developer B: User Story 3 (SWR hooks + Dashboard + ApiKeyManager)
- Coordinate on `main.tsx`: Developer A removes AuthProvider (T024); Developer B adds SWRConfig (T036); sequence these two tasks or merge them in one commit

---

## Notes

- [P] tasks = different files, no in-phase dependencies — safe to run concurrently
- No `@ts-ignore` or broad `any` casts are permitted at any point (FR-009)
- Zustand `persist` localStorage key is `auth-storage` — the old `tokens` and `user` keys are no longer used after US2
- `_hasHydrated` must be excluded from `partialize` — it must always start as `false` on page load
- SWR cache keys must be exact-match strings: `'/usage'` and `'/keys'` — full URLs must not be used
- `useSWRMutation` with `API_KEYS_CACHE_KEY` automatically marks `useSWR(API_KEYS_CACHE_KEY)` stale on success — no manual `mutate()` call needed
- Commit after each task or logical group; stop at any phase checkpoint to validate independently
