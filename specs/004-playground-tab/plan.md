# Implementation Plan: Playground Tab

**Branch**: `004-playground-tab` | **Date**: 2026-04-06 | **Spec**: [spec.md](file:///Users/alhonsh.fit/projects/backend/video_transcoding_api/specs/004-playground-tab/spec.md)
**Input**: Feature specification from `/specs/004-playground-tab/spec.md`

## Summary

Add an interactive "Playground" tab to the authenticated dashboard where developers visually configure transcoding jobs and see a live, syntax-highlighted API request preview. The configuration form exposes every `POST /api/v1/jobs` option — output format (MP4/HLS), social-media preset, subtitle generation, HLS-specific renditions, webhook URL — while the right-hand panel renders the resulting JSON payload in real time with "Copy as cURL" / "Copy JSON" actions. A lightweight backend endpoint (`POST /api/v1/playground/test-job`) proxies test submissions via session auth (JWT), auto-selecting the user's first active API key. The preview panel always displays the canonical `POST /api/v1/jobs` with `X-API-Key: $API_KEY` so developers learn the real integration pattern.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.9 strict (frontend)
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2+, Celery 5.3+ (backend); React 19, React Router 6, Zustand 5, SWR 2, Axios 1.6+ (frontend)
**Styling**: Tailwind CSS v4.2 via `@tailwindcss/vite` plugin; design tokens in `@theme {}` block in `index.css`
**Storage**: PostgreSQL (existing), no new tables needed
**Testing**: Vitest + @testing-library/react (frontend); pytest (backend, if applicable)
**Target Platform**: Web (desktop-primary), SPA served by Vite dev server / static build
**Project Type**: Full-stack web application (FastAPI + React SPA)
**Performance Goals**: Request preview updates < 100 ms on every form change (client-side only; no network calls)
**Constraints**: No new database migrations; playground state is transient/in-memory client side
**Scale/Scope**: Single new page + ~6 new frontend files + 1 new backend endpoint file + 1 new backend schema file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: Feature broken into cohesive, self-contained components. Playground page composed from `PlaygroundForm`, `RequestPreview`, `HlsRenditionEditor`, and a `usePlaygroundForm` hook. No duplication with existing components. All types explicit.
- [x] **Testing Standards**: Vitest unit tests will cover the JSON builder logic, form state hook, and cURL generation utility. Backend endpoint tested with pytest if new logic diverges from existing job creation.
- [x] **UX Consistency**: Follows existing dashboard sidebar navigation, Tailwind token system, and component patterns (SWR hooks, Zustand auth). JSON preview matches actual `POST /api/v1/jobs` contract.
- [x] **Performance**: Preview is pure client-side derivation from form state — no network round-trips. The only network call is the optional "Submit Test Job" which reuses the existing Celery-backed pipeline.

## Project Structure

### Documentation (this feature)

```text
specs/004-playground-tab/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── endpoints/
│   │       ├── jobs.py             # existing — unchanged
│   │       └── playground.py       # [NEW] POST /api/v1/playground/test-job
│   ├── schemas/
│   │   └── playground.py           # [NEW] TestJobRequest/Response schemas
│   └── main.py                     # MODIFY — register playground router

frontend/
├── src/
│   ├── components/
│   │   ├── playground/
│   │   │   ├── PlaygroundForm.tsx      # [NEW] Configuration form (left panel)
│   │   │   ├── RequestPreview.tsx      # [NEW] JSON + cURL preview (right panel)
│   │   │   └── HlsRenditionEditor.tsx  # [NEW] Add/edit/remove HLS renditions
│   │   └── ...existing
│   ├── hooks/
│   │   └── usePlaygroundForm.ts        # [NEW] Form state + JSON builder logic
│   ├── pages/
│   │   └── Playground.tsx              # [NEW] Page shell with split-pane layout
│   ├── types/
│   │   └── index.ts                    # MODIFY — add playground types
│   ├── utils/
│   │   └── curlBuilder.ts              # [NEW] Build cURL string from config
│   ├── App.tsx                         # MODIFY — add route + sidebar link
│   └── index.css                       # MODIFY — add playground design tokens
```

**Structure Decision**: Follows the existing `backend/ + frontend/` web application layout. New frontend components are namespaced under `components/playground/` to maintain separation. Backend adds a single thin endpoint file and schema file, consistent with the existing `endpoints/` pattern.

## Complexity Tracking

> No Constitution violations — no complexity justification needed.
