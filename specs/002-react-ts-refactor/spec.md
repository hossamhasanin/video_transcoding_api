# Feature Specification: Frontend Modernization — React TypeScript, Zustand & SWR

**Feature Branch**: `002-react-ts-refactor`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "Buddy we need to do some refactoring to the frontend part of this project. We need to switch to React + Typescript instead of jsx, we need to user zustand as a state management library, also we need to use SWR when ever is possible. we need to refactor the frontend code to use these stuff"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Works with Full Type Safety (Priority: P1)

A developer opens the frontend codebase and can immediately benefit from static type checking across all components, pages, contexts, and utilities. The editor provides accurate type hints and the build tool catches type mistakes before they reach runtime.

**Why this priority**: This is the foundation of the entire refactoring effort. TypeScript coverage must exist before the other modernizations can be validated. Without it, there is no way to guarantee that the Zustand and SWR migrations are correct. It also delivers independent value — even without Zustand or SWR, full type safety significantly reduces the cost of future changes.

**Independent Test**: A developer can open any source file, introduce a deliberate type mismatch, and immediately receive a compile-time error. Running `npm run build` with no intentional errors produces zero type errors.

**Acceptance Scenarios**:

1. **Given** a fresh checkout of the branch, **When** the developer runs the build command, **Then** the build completes with zero TypeScript type errors across all source files
2. **Given** all source files have been converted, **When** a developer introduces a wrong property type in a component, **Then** the build fails with a descriptive type error pointing to the exact location
3. **Given** the TypeScript configuration is in place, **When** a developer checks any source file, **Then** every file has a `.ts` or `.tsx` extension and no `.jsx` or plain `.js` source files remain
4. **Given** the application is running in development mode, **When** a user navigates through all existing pages (Login, Register, ForgotPassword, ResetPassword, VerifyEmail, Dashboard), **Then** every page loads and behaves identically to the pre-refactor baseline

---

### User Story 2 - Developer Uses Centralized Zustand Store for Auth State (Priority: P2)

A developer who needs to read or update authentication state anywhere in the application uses a single Zustand store rather than wrapping components in a React Context Provider or relying on a hook tied to a specific provider tree.

**Why this priority**: The current React Context approach works but requires a Provider wrapper and is less ergonomic for testing and for accessing state outside the React component tree. Zustand removes this constraint. This story delivers clear structural value independently of SWR migration.

**Independent Test**: The authentication flow (login, logout, session restore, register) can be exercised end-to-end; no `AuthContext.Provider` wrapper exists in the component tree; auth state is accessible via a Zustand store hook from any component without needing a parent provider.

**Acceptance Scenarios**:

1. **Given** the frontend is loaded for the first time, **When** a stored session exists, **Then** a full-page loading spinner is displayed while the Zustand `persist` middleware rehydrates; once hydration is complete the user lands on the Dashboard without a redirect to Login
2. **Given** the user is unauthenticated, **When** the user submits valid login credentials, **Then** the auth store updates its state and the user is redirected to their intended destination
3. **Given** the user is authenticated, **When** the user clicks Logout, **Then** the auth store clears all session data and the user is redirected to the Login page
4. **Given** the auth store holds valid state, **When** any protected route is accessed, **Then** the `ProtectedRoute` guard reads auth state from the Zustand store and allows access without requiring a Context Provider to be present in the component tree
5. **Given** the React Context-based `AuthContext` existed before, **When** the refactor is complete, **Then** no `AuthContext.Provider` or `useContext(AuthContext)` calls remain in the codebase

---

### User Story 3 - Developer Fetches Server Data via SWR Hooks (Priority: P3)

A developer working on any page that displays server-fetched data uses SWR hooks instead of manual `useEffect` + `useState` fetch patterns. This gives automatic caching, background revalidation, and loading/error states out of the box.

**Why this priority**: SWR is already installed in the project but unused. Adopting it for all data-fetching endpoints eliminates repetitive boilerplate (multiple `useState` calls for data/loading/error, manual `useEffect` fetch orchestration, and manual refetch-after-mutation patterns). This story delivers value independently once Story 1 (TypeScript) is in place.

**Independent Test**: Open Dashboard and ApiKeyManager in the browser. The usage stats and API key list load correctly. Network throttling can confirm SWR's loading states appear. Revoking or creating an API key triggers an automatic data refresh without a full page reload.

**Acceptance Scenarios**:

1. **Given** the Dashboard page is rendered, **When** it mounts, **Then** usage statistics are fetched via an SWR hook and display a loading indicator until data arrives, then render correctly
2. **Given** the ApiKeyManager component is rendered, **When** it mounts, **Then** the API key list is fetched via an SWR hook and the list renders without requiring manual `useEffect` fetch orchestration
3. **Given** the user creates a new API key, **When** the creation succeeds, **Then** the SWR-backed API key list automatically reflects the new key without a manual full refetch call or page reload
4. **Given** the user revokes an API key, **When** the revocation succeeds, **Then** the SWR-backed API key list automatically removes the revoked key
5. **Given** the network is unavailable when a page loads, **When** the SWR fetch fails, **Then** an appropriate error state is shown (the same user-facing behaviour as the current manual-fetch implementation)
6. **Given** the refactor is complete, **When** the codebase is audited, **Then** no `useEffect`-based data fetching patterns remain for endpoints that have an SWR equivalent; every data-fetching call that was previously a `useEffect` + `useState` pattern is replaced by an SWR hook

---

### Edge Cases

- What happens when the stored session token is expired on load? The auth store must detect the 401 from the token-refresh attempt, clear storage, and redirect to Login — same behaviour as the existing Axios interceptor.
- What happens while the Zustand `persist` middleware is rehydrating session state on application load? A full-page loading spinner MUST be displayed and all route evaluation MUST be suspended until hydration is complete, preventing a spurious redirect to Login for authenticated users.
- What happens when an SWR fetch fails due to a network error? The component must show an error state and the application must not crash.
- What happens when a user creates or revokes an API key while the SWR cache is stale? The mutation must trigger cache invalidation so the displayed list remains consistent with the server.
- What happens when the TypeScript compiler encounters the existing plain-JS utility file (`api.js`)? It must be converted and typed; no untyped `.js` source files may remain.
- What happens to the Vite build configuration when TypeScript is introduced? Vite's TypeScript support is built-in; the config file (if created) must use `.ts` extension and the build must succeed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All frontend source files (`.jsx`, `.js`) MUST be converted to TypeScript (`.tsx` for React components, `.ts` for utilities and non-JSX modules)
- **FR-002**: A TypeScript configuration (`tsconfig.json`) MUST be introduced with strict type checking enabled; the project MUST compile with zero type errors
- **FR-003**: The Zustand state management library MUST be added as a runtime dependency
- **FR-004**: A Zustand store MUST replace the existing React Context API (`AuthContext`) as the sole source of authentication state (`user`, `loading`, `isAuthenticated`) and all auth action functions (`login`, `register`, `logout`, `refreshProfile`, `forgotPassword`, `resetPassword`, `changePassword`, `verifyEmail`, `resendVerification`); the store MUST use Zustand's `persist` middleware backed by `localStorage` for automatic session rehydration on page load, eliminating manual `localStorage.getItem/setItem` calls from auth logic
- **FR-005**: The `AuthContext.Provider` wrapper and all `useContext(AuthContext)` call sites MUST be removed from the codebase; auth state MUST be consumed exclusively through the Zustand store hook
- **FR-006**: SWR MUST be used for all server data fetching that was previously implemented with `useEffect` + `useState` patterns, specifically: usage statistics (Dashboard) and the API key list (ApiKeyManager); a global `SWRConfig` provider MUST wrap the application and supply the existing Axios instance as the shared custom fetcher so all SWR hooks automatically inherit auth headers and the token-refresh interceptor without per-hook configuration
- **FR-007**: After each successful API key creation or revocation, the SWR cache for the API key list MUST be invalidated or mutated so the displayed list reflects the latest server state without a full page reload
- **FR-008**: All existing application features — authentication flows, session restore, protected routing, Dashboard statistics display, API key CRUD — MUST function identically after the refactor
- **FR-009**: The build pipeline MUST succeed with zero TypeScript compilation errors; no source files may have TypeScript errors suppressed via `@ts-ignore` or `any` type casts introduced solely to avoid migrating types properly
- **FR-010**: The token-refresh and request-retry behaviour implemented in the Axios instance MUST be preserved and typed correctly after migration

### Key Entities

- **Auth Store**: Centralized store holding the authenticated user's identity, session loading state, and derived authentication status; exposes all auth action functions to any consuming component; uses Zustand's `persist` middleware to persist state to `localStorage` and rehydrate automatically on application load
- **User Session**: Persisted user identity and access/refresh token pair stored locally and restored on application load
- **API Key**: Named credential with a prefix, creation timestamp, and an identifier; supports listing, creation, and revocation
- **Usage Statistics**: Aggregated metrics per user: total jobs, completed jobs, failed jobs, storage consumed, and total processed duration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every source file in the frontend `src/` directory carries a `.ts` or `.tsx` extension; zero `.jsx` or untyped `.js` source files remain
- **SC-002**: Running the build command produces zero TypeScript compilation errors in strict mode; no `@ts-ignore` directives or broad `any` casts are introduced as migration shortcuts
- **SC-003**: All existing user-facing flows (registration, login, password reset, email verification, dashboard viewing, API key management) complete successfully in the browser after the refactor, with no regressions in behaviour or visual layout
- **SC-004**: Every previously `useEffect`-based data fetch (usage stats, API key list) is replaced by an SWR hook; no manual `useEffect` fetch orchestration remains for those endpoints
- **SC-005**: The React Context Provider (`AuthContext.Provider`) is removed from the component tree; all authentication state is sourced exclusively from the Zustand store, verifiable by grepping for `AuthContext` or `useContext` in the codebase and finding zero results
- **SC-006**: API key list updates (create, revoke) are reflected in the UI automatically following a successful mutation, without requiring a full page reload or manual refetch trigger

## Assumptions

- This refactoring effort is scope-limited to modernizing the existing frontend stack; no new user-facing features or UI changes are included
- All existing backend API contracts, endpoint paths, and response shapes remain unchanged; the frontend refactor does not require any backend modifications
- The Zustand library needs to be added as a new runtime dependency; it is not currently present in `package.json`
- The `swr` package is already installed (v2.2.5) and does not require a version upgrade
- TypeScript type definitions for React (`@types/react`, `@types/react-dom`) are already present as dev dependencies and do not need to be re-installed
- Vite natively supports TypeScript without requiring additional plugins; the existing Vite setup is sufficient after a `tsconfig.json` is added
- The ESLint configuration will need minor updates to support TypeScript files, but a full ESLint overhaul is out of scope
- No automated tests are being written as part of this refactor (the `tests/` directory is currently empty); the success criteria are validated through manual browser testing and a successful build
- CSS and visual styling are out of scope; `index.css` is not being changed
- The Dockerfile and `nginx.conf` are not affected by this refactor

## Clarifications

### Session 2026-04-05

- Q: Should the Zustand auth store use `persist` middleware (localStorage) for automatic session rehydration, keep tokens in localStorage manually with no middleware, or store tokens in memory only? → A: Use `zustand/middleware` `persist` backed by `localStorage` — store owns rehydration automatically
- Q: Should SWR hooks share a global `SWRConfig` provider with an Axios-based fetcher, each define their own inline fetch function, or use native `fetch`? → A: Global `SWRConfig` provider with a shared Axios-based fetcher — all hooks inherit it automatically
- Q: What should the UI render while Zustand `persist` rehydrates session state on load — spinner, blank, or optimistic route render? → A: Full-page loading spinner until hydration is complete; all route evaluation suspended during that window
