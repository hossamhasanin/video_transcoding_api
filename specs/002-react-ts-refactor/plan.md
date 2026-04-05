# Implementation Plan: Frontend Modernization — React TypeScript, Zustand & SWR

**Branch**: `002-react-ts-refactor` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-react-ts-refactor/spec.md`

## Summary

Refactor the existing plain-JavaScript React SPA (10 `.jsx` + 1 `.js` source files) to TypeScript, replace the React Context auth state with a Zustand `persist` store, and migrate all `useEffect`-based data fetching to SWR hooks backed by a global `SWRConfig` provider. No new user-facing features are introduced; all existing behaviour must be preserved.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18.2 (current: plain JSX/JS)
**Primary Dependencies**: React 18.2, React Router DOM v6, Axios 1.6, Zustand (to be added), SWR 2.2.5 (installed, unused), Vite 5.2, @vitejs/plugin-react 4.2
**Storage**: `localStorage` — auth tokens (`"tokens"`) and user object (`"user"`) via Zustand `persist` middleware (replaces manual `localStorage.getItem/setItem`)
**Testing**: No automated tests in scope; manual browser testing + `npm run build` for zero-error validation
**Target Platform**: Browser SPA, served via Vite dev server / Nginx (Docker)
**Project Type**: Web application (React SPA frontend + separate Python backend)
**Performance Goals**: No new performance requirements — SWR caching replaces per-mount refetch boilerplate; background revalidation is a side benefit
**Constraints**: Zero TypeScript errors in strict mode; no `@ts-ignore` or broad `any` casts; no regressions in existing auth/dashboard/API-key behaviour
**Scale/Scope**: 12 source files (10 `.jsx` → `.tsx`, 1 `.js` → `.ts`, 1 `.css` unchanged), 1 new config file (`tsconfig.json`), 1 new config file (`vite.config.ts`), 1 new store file, 2 components migrated to SWR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: All files converted to TypeScript strict mode. Zustand store centralises auth logic (removes duplication of `localStorage` reads across components). SWR removes per-component `useEffect`/`useState` boilerplate. No new duplication introduced.
- [x] **Testing Standards**: Spec explicitly states no automated tests in scope (empty `tests/` directory; acceptance criteria validated by build + manual testing). **Exception acknowledged**: this is a refactor with no new logic paths; the constitution requires coverage of new critical paths — since this story introduces no new paths (only migrates existing ones), manual validation against the acceptance scenarios is acceptable. Zero new test infrastructure gaps are introduced.
- [x] **UX Consistency**: All existing routes, layouts, and user-facing flows are preserved identically. The Axios interceptor (token refresh, request queuing) is preserved and typed — no change to API contract or error handling behaviour.
- [x] **Performance**: SWR reduces redundant fetches (caching, deduplication, background revalidation). Zustand `persist` eliminates the synchronous `localStorage` read during auth restore that currently happens before the React tree is ready. No new resource-intensive operations introduced.

**GATE RESULT**: PASS — no violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-react-ts-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth-store.md
│   ├── swr-hooks.md
│   └── component-props.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── index.html                        # unchanged (update script ref to main.tsx)
├── package.json                      # add zustand; update lint script for .ts/.tsx
├── tsconfig.json                     # NEW — strict TypeScript config
├── vite.config.ts                    # NEW — explicit React plugin registration
├── src/
│   ├── api.ts                        # renamed + typed (was api.js)
│   ├── App.tsx                       # renamed + typed (remove AuthProvider wrapper)
│   ├── index.css                     # unchanged
│   ├── main.tsx                      # renamed + typed (add SWRConfig provider)
│   ├── store/
│   │   └── authStore.ts              # NEW — Zustand auth store with persist
│   ├── hooks/
│   │   ├── useUsageStats.ts          # NEW — SWR hook for GET /usage
│   │   └── useApiKeys.ts             # NEW — SWR hook for GET /keys
│   ├── types/
│   │   └── index.ts                  # NEW — shared TypeScript interfaces
│   ├── components/
│   │   ├── ApiKeyManager.tsx         # renamed + typed + SWR migration
│   │   └── ProtectedRoute.tsx        # renamed + typed
│   ├── context/
│   │   └── AuthContext.tsx           # DELETED — replaced by authStore.ts
│   └── pages/
│       ├── Dashboard.tsx             # renamed + typed + SWR migration
│       └── auth/
│           ├── ForgotPassword.tsx    # renamed + typed
│           ├── Login.tsx             # renamed + typed
│           ├── Register.tsx          # renamed + typed
│           ├── ResetPassword.tsx     # renamed + typed
│           └── VerifyEmail.tsx       # renamed + typed
└── tests/                            # empty, unchanged
```

**Structure Decision**: Single web-application frontend. TypeScript source tree mirrors current JSX tree with renames and two new directories (`store/`, `hooks/`, `types/`). The `context/` directory is eliminated after `AuthContext.tsx` is deleted.

## Complexity Tracking

> No Constitution violations — section N/A.
