# Tasks: Playground Tab

**Input**: Design documents from `/specs/004-playground-tab/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification — test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Includes exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/`
- **Frontend**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add playground design tokens and TypeScript types shared across all user stories

- [x] T001 Add playground design tokens (JSON syntax colors, panel borders) to `frontend/src/index.css` `@theme {}` block
- [x] T002 [P] Add playground TypeScript types (`PlaygroundFormState`, `HlsConfigState`, `RenditionState`, `CodecPreset`, `RequestPreviewPayload`, `TestJobResponse`) to `frontend/src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core form state hook and JSON builder logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement `usePlaygroundForm` hook with `useReducer` for form state management (all form actions: set field, set HLS field, add/edit/remove rendition, reset) in `frontend/src/hooks/usePlaygroundForm.ts`
- [x] T004 Implement JSON preview derivation logic inside `usePlaygroundForm` using `useMemo` — compute `RequestPreviewPayload` from form state, omitting fields at default values per FR-014, in `frontend/src/hooks/usePlaygroundForm.ts`

**Checkpoint**: Foundation ready — form state hook returns `{ state, dispatch, previewPayload }`. User story implementation can now begin.

---

## Phase 3: User Story 1 — Configure and Preview a Transcoding Job (Priority: P1) 🎯 MVP

**Goal**: Developer navigates to the Playground tab, configures a transcoding job via form controls, and sees a live syntax-highlighted JSON request preview updating in real time.

**Independent Test**: Navigate to the Playground tab, adjust every form control (source URL, output format, preset, subtitles, webhook URL), and verify the live JSON preview reflects each change instantly with correct field names and values.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create `PlaygroundForm` component with controls for source URL, output format (MP4/HLS), preset (TikTok/YouTube/Instagram/None), subtitle toggle, and webhook URL in `frontend/src/components/playground/PlaygroundForm.tsx`
- [x] T006 [P] [US1] Create `RequestPreview` component with syntax-highlighted JSON display (custom tokenizer using Tailwind color classes on `<span>` elements inside `<pre><code>`), endpoint header (`POST {VITE_API_URL}/jobs`), and `X-API-Key: $API_KEY` header display in `frontend/src/components/playground/RequestPreview.tsx`
- [x] T007 [US1] Create `Playground` page shell with side-by-side split-pane layout (~55% form / ~45% preview, independently scrollable panels using Flexbox + `overflow-y-auto`) in `frontend/src/pages/Playground.tsx`
- [x] T008 [US1] Wire `usePlaygroundForm` hook into `Playground` page, pass state to `PlaygroundForm` and `previewPayload` to `RequestPreview` in `frontend/src/pages/Playground.tsx`
- [x] T009 [US1] Add `/playground` route (protected via `ProtectedRoute`) and "Playground" sidebar link (between "Dashboard" and "Settings") in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional — developer can navigate to Playground, configure a job, and see live JSON preview updating with every form change.

---

## Phase 4: User Story 2 — Configure HLS-Specific Options (Priority: P2)

**Goal**: When "HLS" output format is selected, additional HLS configuration controls appear (segment duration, codec preset, CRF, video profile, renditions) and the preview reflects the nested `hls_config` object.

**Independent Test**: Select HLS output format, adjust each HLS sub-option (segment duration slider, CRF slider, codec preset dropdown, video profile dropdown), add/edit/remove renditions, and verify the `hls_config` object in the JSON preview updates correctly. Verify switching back to MP4 removes `hls_config` from the preview.

### Implementation for User Story 2

- [x] T010 [P] [US2] Create `HlsRenditionEditor` component with add/edit/remove rendition rows (name, width, height, video bitrate, audio bitrate fields), inline validation for unique names (`^[a-zA-Z0-9_\-]+$`) and positive dimensions in `frontend/src/components/playground/HlsRenditionEditor.tsx`
- [x] T011 [US2] Add HLS configuration section to `PlaygroundForm` — conditionally rendered when `output_format === "hls"` — with segment duration slider (2–30), codec preset dropdown (9 presets), CRF slider (0–51), video profile dropdown (baseline/main/high), and embedded `HlsRenditionEditor` in `frontend/src/components/playground/PlaygroundForm.tsx`

**Checkpoint**: User Stories 1 AND 2 should both work independently — MP4 config with live preview, and HLS config with full `hls_config` object in preview.

---

## Phase 5: User Story 3 — Copy Request as cURL or JSON (Priority: P3)

**Goal**: Developer copies the configured API request as a ready-to-use cURL command or raw JSON payload to their clipboard with visual confirmation.

**Independent Test**: Configure options in the form, click "Copy as cURL", paste into a text editor, and verify it's a valid cURL command with correct endpoint (`{VITE_API_URL}/jobs`), headers (`X-API-Key: $API_KEY`, `Content-Type: application/json`), and JSON body. Click "Copy JSON" and verify the pasted JSON matches the preview.

### Implementation for User Story 3

- [x] T012 [P] [US3] Create `curlBuilder` utility function — takes API base URL (from `VITE_API_URL`) and JSON body object, returns multi-line cURL string with `-X POST`, content-type header, `X-API-Key: $API_KEY` header placeholder, and `-d '{...}'` body in `frontend/src/utils/curlBuilder.ts`
- [x] T013 [US3] Add "Copy as cURL" and "Copy JSON" buttons to `RequestPreview` with clipboard API (`navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback) and 2-second "Copied!" visual confirmation via local state in `frontend/src/components/playground/RequestPreview.tsx`

**Checkpoint**: User Stories 1, 2, AND 3 should all work — configure, preview, and copy as cURL or JSON.

---

## Phase 6: User Story 4 — Submit a Test Job from the Playground (Priority: P4)

**Goal**: Developer submits a live test job from the Playground using session auth. The backend auto-selects their first active API key. The response (job ID, status) displays in a Response tab on the right panel.

**Independent Test**: Enter a valid source URL, submit the test job, verify the right panel switches to a Response tab showing the job ID and "pending" status. Toggle between Request/Response tabs. Test error cases: no API key, invalid URL, concurrent limit exceeded.

### Backend Implementation for User Story 4

- [x] T014 [P] [US4] Create `TestJobRequest` and `TestJobResponse` Pydantic schemas in `backend/app/schemas/playground.py` — `TestJobRequest` mirrors `JobCreate` fields; `TestJobResponse` mirrors `JobResponse`
- [x] T015 [US4] Create `POST /api/v1/playground/test-job` endpoint in `backend/app/api/endpoints/playground.py` — authenticated via `get_current_user` (JWT bearer), auto-selects first active API key (ordered by `created_at ASC`), enforces concurrent job limit, delegates to existing job creation + Celery dispatch logic, returns 201 with `TestJobResponse`
- [x] T016 [US4] Register playground router in `backend/app/main.py` — add `from app.api.endpoints import playground` and `app.include_router(playground.router, prefix=f"{settings.API_V1_STR}/playground", tags=["playground"])`

### Frontend Implementation for User Story 4

- [x] T017 [US4] Add source URL validation (valid URL format) with inline error feedback and "Submit Test Job" button (disabled when URL invalid) to `PlaygroundForm` in `frontend/src/components/playground/PlaygroundForm.tsx`
- [x] T018 [US4] Add Request/Response tab toggle, response display (syntax-highlighted JSON), submission loading state, error display, and "live job" warning callout to `RequestPreview` in `frontend/src/components/playground/RequestPreview.tsx`
- [x] T019 [US4] Wire submission flow in `Playground` page — POST to `/api/v1/playground/test-job` via Axios with JWT bearer token, handle 201/400/429 responses, pass response data to `RequestPreview`, auto-switch to Response tab in `frontend/src/pages/Playground.tsx`

**Checkpoint**: All four user stories should now be fully functional end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements that affect multiple user stories

- [x] T020 [P] Verify strict TypeScript typing — run `cd frontend && npx tsc --noEmit` and resolve any errors
- [x] T021 [P] Validate UX consistency — sidebar link active state, form control styling, preview panel theming match existing dashboard patterns in `frontend/src/App.tsx` and `frontend/src/index.css`
- [x] T022 Verify JSON preview performance — confirm preview updates < 100 ms on every form change (client-side only, no network calls)
- [x] T023 Run quickstart.md validation — walk through the full quickstart flow (navigate → configure → preview → copy → submit) end-to-end
- [x] T024 [P] Edge case validation — duplicate rendition names show inline error, HLS→MP4 toggle removes `hls_config` from preview, empty source URL shows placeholder value, long URLs/configs scroll correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs `usePlaygroundForm` hook)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (needs `usePlaygroundForm` hook). Can run in parallel with US1 if `PlaygroundForm` structure is agreed upon, but practically depends on US1 for the page shell.
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs `RequestPreview` component to exist for copy buttons)
- **User Story 4 (Phase 6)**: Backend tasks (T014–T016) can start after Phase 1. Frontend tasks (T017–T019) depend on Phase 3 (needs page shell and `RequestPreview`).
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — integrates with US1's `PlaygroundForm` but the HLS section is additive
- **User Story 3 (P3)**: Depends on US1 — adds copy buttons to the existing `RequestPreview` component
- **User Story 4 (P4)**: Backend is independent; frontend depends on US1 for the page shell and `RequestPreview` component

### Within Each User Story

- Types/models before hooks
- Hooks/utilities before components
- Components before page-level wiring
- Backend before frontend wiring (for US4)

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T005 and T006 (US1 components) can run in parallel
- T010 (US2 rendition editor) can run in parallel with T012 (US3 cURL builder)
- T014 (backend schema) can run in parallel with any frontend work
- T020, T021, T024 (Polish) can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch both US1 components together (different files, no dependencies):
Task: "Create PlaygroundForm component in frontend/src/components/playground/PlaygroundForm.tsx"
Task: "Create RequestPreview component in frontend/src/components/playground/RequestPreview.tsx"

# Then wire them sequentially:
Task: "Create Playground page shell in frontend/src/pages/Playground.tsx"
Task: "Wire hook into Playground page"
Task: "Add route + sidebar link in App.tsx"
```

---

## Parallel Example: User Story 4 (Backend + Frontend)

```bash
# Backend tasks can start immediately after Phase 1:
Task: "Create Pydantic schemas in backend/app/schemas/playground.py"
Task: "Create endpoint in backend/app/api/endpoints/playground.py"
Task: "Register router in backend/app/main.py"

# Frontend tasks start after US1 is complete:
Task: "Add URL validation + submit button to PlaygroundForm"
Task: "Add Response tab + toggle to RequestPreview"
Task: "Wire submission flow in Playground page"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (tokens + types)
2. Complete Phase 2: Foundational (usePlaygroundForm hook)
3. Complete Phase 3: User Story 1 (form + preview + page + routing)
4. **STOP and VALIDATE**: Navigate to Playground, configure all options, verify live preview
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test HLS config independently → Deploy/Demo
4. Add User Story 3 → Test copy functionality → Deploy/Demo
5. Add User Story 4 → Test live submission end-to-end → Deploy/Demo
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new database migrations required — all playground state is transient/client-side
- Backend work (US4 only) is a thin proxy endpoint reusing existing job creation logic
