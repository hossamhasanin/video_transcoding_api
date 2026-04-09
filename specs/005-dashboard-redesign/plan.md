# Implementation Plan: Dashboard Visual Redesign

**Branch**: `005-dashboard-redesign` | **Date**: 2026-04-09 | **Spec**: [spec.md](file:///Users/alhonsh.fit/projects/backend/video_transcoding_api/specs/005-dashboard-redesign/spec.md)
**Input**: Feature specification from `/specs/005-dashboard-redesign/spec.md`

## Summary

Transform the TranscodeFlow dashboard from a generic Bootstrap-inspired admin panel into a premium, visually distinctive developer tool. The redesign replaces the flat color palette with a curated design token system (electric indigo accent, deep warm-gradient sidebar, layered surface colors), introduces Inter font from Google Fonts, and adds micro-interactions (count-up animations, hover lifts, pulse badges, slide-down panels). All changes are purely visual — no backend changes, no new API endpoints, no data flow modifications. The existing Tailwind CSS v4 `@theme {}` infrastructure is extended with new tokens.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (frontend only)
**Primary Dependencies**: React 19, React Router 6, Zustand 5, SWR 2, Axios 1.6+ (existing); lucide-react (new — icon library)
**Styling**: Tailwind CSS v4.2 via `@tailwindcss/vite` plugin; design tokens in `@theme {}` block in `index.css`
**Storage**: N/A — no backend or database changes
**Testing**: Vitest + @testing-library/react (existing)
**Target Platform**: Web (desktop-primary, 1024px–2560px), SPA served by Vite dev server / static build
**Project Type**: Frontend SPA (React + Tailwind CSS)
**Performance Goals**: Page load increase ≤ 500ms including web font; all hover/focus transitions 200–300ms
**Constraints**: Zero functional regressions; no backend changes; Inter font via Google Fonts CDN with `font-display: swap`; mobile (<768px) out of scope; 768px–1024px best-effort
**Scale/Scope**: ~8 modified frontend files + 1 new utility hook + 1 new dependency (lucide-react)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: All visual changes are scoped to design tokens (index.css) and component markup (Tailwind classes). New `useCountUp` hook is self-contained and reusable. No inter-component coupling introduced. lucide-react icons are tree-shakable — only used icons are bundled.
- [x] **Testing Standards**: Visual regression verified via manual before/after screenshot comparison (SC-002). Existing Vitest suite must continue passing with zero regressions. The count-up hook is unit-testable.
- [x] **UX Consistency**: All pages (auth, dashboard, playground) use the same unified design token palette. No hardcoded hex values remain in component code (FR-008). Sidebar, cards, tables, and forms share consistent visual language.
- [x] **Performance**: Inter font loaded with `font-display: swap` — zero FOIT. All animations resolve in ≤1s with `prefers-reduced-motion` support (FR-012). No new API calls. lucide-react is tree-shakable (~400B per icon).

## Project Structure

### Documentation (this feature)

```text
specs/005-dashboard-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── index.css                       # MODIFY — new design tokens, Inter font import, animation keyframes, reduced-motion rules
│   ├── App.tsx                         # MODIFY — sidebar redesign (gradient, logo, glow indicators, avatar)
│   ├── main.tsx                        # unchanged
│   ├── hooks/
│   │   ├── useCountUp.ts              # [NEW] Animated count-up hook (requestAnimationFrame)
│   │   └── ...existing (unchanged)
│   ├── pages/
│   │   ├── Dashboard.tsx              # MODIFY — stats cards with icons, glassmorphism, count-up, bento grid
│   │   ├── Playground.tsx             # MODIFY — apply new token palette (colors, typography only)
│   │   └── auth/
│   │       ├── Login.tsx              # MODIFY — new palette, background treatment, accent colors
│   │       ├── Register.tsx           # MODIFY — new palette, background treatment
│   │       ├── ForgotPassword.tsx     # MODIFY — new palette, background treatment
│   │       ├── ResetPassword.tsx      # MODIFY — new palette, background treatment
│   │       └── VerifyEmail.tsx        # MODIFY — new palette, background treatment
│   ├── components/
│   │   ├── JobHistory.tsx             # MODIFY — frosted header, animated badges, slide-down panels, pill filters
│   │   ├── ApiKeyManager.tsx          # MODIFY — card-based keys, styled inputs, accent alerts
│   │   └── ProtectedRoute.tsx         # unchanged
│   └── types/                          # unchanged
├── index.html                          # MODIFY — add Google Fonts <link> with preconnect
└── package.json                        # MODIFY — add lucide-react dependency
```

**Structure Decision**: Follows the existing frontend-only layout. No new component files are created — the redesign modifies existing components in-place by replacing their Tailwind utility classes and adding design token references. The only new file is `useCountUp.ts`, a reusable hook for animated number display. All design tokens are centralized in `index.css` using the existing `@theme {}` system.

## Complexity Tracking

> No Constitution violations — no complexity justification needed.
