# Implementation Plan: Add Tailwind CSS Styling Support

**Branch**: `003-add-tailwind-css` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-add-tailwind-css/spec.md`

## Summary

Migrate the React frontend from a mixed styling approach (global BEM-style CSS classes + inline `React.CSSProperties` objects) to a unified **Tailwind CSS v4** utility-class system. Tailwind v4 is integrated via the `@tailwindcss/vite` Vite plugin; all configuration is CSS-first (`@theme {}` in `index.css`); the global stylesheet is audited and stripped of all non-`@keyframes`/non-pseudo-selector rules; all 7 components/pages are migrated to utility classes with zero visual regression.

## Technical Context

**Language/Version**: TypeScript (ES2020 target), `strict: true`  
**Frontend Framework**: React 18.2.0, React Router DOM 6.22.3  
**Build Tool**: Vite 5.2.0 + `@vitejs/plugin-react`  
**Primary Dependencies**: `tailwindcss` v4 (to add), `@tailwindcss/vite` (to add)  
**Storage**: N/A — frontend-only styling migration  
**Testing**: No automated testing framework installed; spec explicitly requires manual visual review only (SC-001 clarification)  
**Target Platform**: Web browser (Vite dev server in development; Nginx in production via Docker)  
**Project Type**: React SPA (single-page application)  
**Performance Goals**: Build produces only used utility classes (zero dead CSS); no styling-related errors or warnings in `vite build` output  
**Constraints**: Zero visual regression across all pages; Tailwind class detection scoped to `frontend/src/**` only; no JS config file (`tailwind.config.ts`) — CSS-first only  
**Scale/Scope**: 7 source files to migrate (App.tsx, Dashboard.tsx, ApiKeyManager.tsx, ProtectedRoute.tsx, Login.tsx, Register.tsx, ForgotPassword.tsx, ResetPassword.tsx, VerifyEmail.tsx), 1 global CSS file to replace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: Refactor eliminates inconsistent styling (mixed BEM classes + inline objects) and replaces with a single approach (Tailwind utility classes). Each component becomes self-contained for styling. No duplication. TypeScript strict mode is unaffected.
- [x] **Testing Standards**: No new business logic is introduced; this is a pure visual infrastructure migration. The constitution's "critical paths and boundary conditions" refer to functional behaviour, not visual appearance. Spec explicitly clarifies no automated visual regression tools are required (SC-001 Q&A). **Note: the test directory is currently empty — this is a pre-existing gap outside this feature's scope.**
- [x] **UX Consistency**: Migration unifies all styling to a single approach (Tailwind utility classes), directly improving interface consistency (FR-002, SC-002, SC-003).
- [x] **Performance**: Tailwind v4 with Vite tree-shakes unused utilities; only classes actually referenced in JSX are emitted to the production CSS bundle (SC-005).

## Project Structure

### Documentation (this feature)

```text
specs/003-add-tailwind-css/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── package.json         # Add: tailwindcss, @tailwindcss/vite
├── vite.config.ts       # Add: tailwindcss() Vite plugin
└── src/
    ├── index.css        # Replace all rules with @import + @source + @theme {}
    ├── App.tsx          # Migrate layout classes (.layout, .sidebar, .content, ...)
    ├── components/
    │   ├── ApiKeyManager.tsx   # Migrate all inline styles → Tailwind
    │   └── ProtectedRoute.tsx  # Migrate loading state inline style → Tailwind
    ├── pages/
    │   ├── Dashboard.tsx       # Migrate cardStyle/statStyle inline objects → Tailwind
    │   └── auth/
    │       ├── Login.tsx        # Migrate .auth-* class names → Tailwind
    │       ├── Register.tsx     # Migrate .auth-* + .password-requirements → Tailwind
    │       ├── ForgotPassword.tsx  # Migrate .auth-* + inline Link styles → Tailwind
    │       ├── ResetPassword.tsx   # Migrate .auth-* + inline Link styles → Tailwind
    │       └── VerifyEmail.tsx     # Migrate .auth-* + inline Link styles → Tailwind
    └── [other files unchanged: api.ts, hooks/, store/, types/, main.tsx]
```

**Structure Decision**: Web application — Option 2 layout with only the `frontend/` subtree in scope. Backend is unaffected. No new directories are created; all changes are in-place file edits.

## Complexity Tracking

> No Constitution Check violations requiring justification.
