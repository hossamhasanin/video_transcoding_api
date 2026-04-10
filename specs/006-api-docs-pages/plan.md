# Implementation Plan: API Documentation Pages

**Branch**: `006-api-docs-pages` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-api-docs-pages/spec.md`

## Summary

Create developer-friendly API documentation pages for the TranscodeFlow backend endpoints, integrated into the frontend as a single-page hub at `/docs` with anchor-based section navigation. Documentation content is sourced from hand-curated static TypeScript data files in `src/data/docs/`, rendered with syntax-highlighted code blocks and copy-to-clipboard functionality. The page is publicly accessible without authentication, with a "Documentation" sidebar link visible to all users.

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19 / Vite 5.2  
**Primary Dependencies**: React 19, react-router-dom 6, Tailwind CSS v4 (via @tailwindcss/vite), lucide-react (icons), Zustand (auth store — sidebar awareness only)  
**Storage**: N/A (static TypeScript data files, no backend storage)  
**Testing**: Vitest + @testing-library/react + jsdom  
**Target Platform**: Web browser (SPA), viewports 375px–1920px  
**Project Type**: Web application (frontend feature only)  
**Performance Goals**: Documentation page loads and renders within 2 seconds on broadband (SC-006); all content is static — no API calls  
**Constraints**: No new runtime dependencies for syntax highlighting (reuse existing JSON syntax color tokens in index.css); cURL/shell tokens may need additions to the theme  
**Scale/Scope**: ~30+ backend endpoints across 8 API domains; single documentation page with ~8 anchor sections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 (initial check)**:
- [x] **Code Quality**: All documentation components will be modular, typed with explicit `React.ReactElement` return types, and follow the established component patterns (function components, Tailwind-only styling). Content data is separated from presentation in `src/data/docs/` (FR-011, SC-005).
- [x] **Testing Standards**: Critical paths (navigation rendering, code copy functionality, route accessibility, section anchor scrolling) will have Vitest + Testing Library coverage. Data files are typed, providing compile-time validation.
- [x] **UX Consistency**: Documentation page follows existing design system (Tailwind v4 tokens, card patterns, sidebar NavLink pattern). Sidebar entry uses same `NavLink` + lucide icon pattern as Dashboard/Playground/Settings.
- [x] **Performance**: All content is static TypeScript data — zero API calls, zero loading states for content. Page is a single route with anchor-based navigation, no code splitting needed. SEO meta tags are static strings.

**Post-Phase 1 (re-evaluation against design artifacts)**:
- [x] **Code Quality**: All 5 component interfaces and 3 hook contracts use strict TypeScript types with union enums (`HttpMethod`, `AuthType`, `ParamLocation`, `CodeLanguage`). Data model separates content (`src/data/docs/`) from presentation (`src/components/docs/`). No duplication across contracts.
- [x] **Testing Standards**: Component props-in/render-out contracts are directly testable via @testing-library/react. Hook return types support renderHook testing. Static data files gain compile-time type validation. `quickstart.md` defines 8 verification steps covering critical paths.
- [x] **UX Consistency**: Sidebar NavLink, card pattern (`bg-surface-raised rounded-xl`), icon library (`lucide-react`), and public route registration all match existing codebase patterns documented in research.md R5. JSON highlighting extends existing `text-json-*` tokens; cURL tokens follow same `text-curl-*` naming convention.
- [x] **Performance**: Zero runtime dependencies added. Single `IntersectionObserver` (no scroll listeners). All content is static TS data — zero API calls. `navigator.clipboard.writeText` is native. ~30 lines of regex for cURL highlighting.

## Project Structure

### Documentation (this feature)

```text
specs/006-api-docs-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/src/
├── components/
│   └── docs/
│       ├── DocsSidebar.tsx          # In-page section navigation (sticky)
│       ├── EndpointCard.tsx         # Single endpoint display (method, path, params, examples)
│       ├── CodeBlock.tsx            # Syntax-highlighted code with copy button
│       ├── ParamTable.tsx           # Endpoint parameter table
│       └── SectionHeading.tsx       # Section anchor heading with ID
├── data/
│   └── docs/
│       ├── index.ts                 # Re-exports all sections + types
│       ├── types.ts                 # TypeScript interfaces for doc data structures
│       ├── getting-started.ts       # Getting Started section content
│       ├── authentication.ts        # Auth endpoints data
│       ├── jobs.ts                  # Jobs endpoints data
│       ├── uploads.ts               # Uploads endpoints data
│       ├── api-keys.ts              # API Keys endpoints data
│       ├── usage.ts                 # Usage Statistics endpoints data
│       └── webhooks-settings.ts     # Webhooks & Settings endpoints data
├── pages/
│   └── ApiDocs.tsx                  # Main documentation page component
├── hooks/
│   └── useActiveSection.ts          # Intersection Observer for active section tracking
└── index.css                        # (existing) Add shell/cURL syntax tokens to @theme
```

**Structure Decision**: Frontend-only feature using the existing `frontend/src/` web application structure. New `components/docs/` directory isolates documentation-specific components. New `data/docs/` directory holds static content data files per FR-011. No backend changes required.

## Complexity Tracking

> No constitution violations identified. All design decisions align with established patterns.
