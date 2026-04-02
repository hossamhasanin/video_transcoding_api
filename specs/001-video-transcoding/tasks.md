# Tasks: Video Transcoding API

**Input**: Design documents from `/specs/001-video-transcoding/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directories (`backend/app/`, `backend/alembic/`, `frontend/src/`)
- [x] T002 Initialize Python project and create `backend/requirements.txt` with FastAPI, SQLAlchemy, Celery, Boto3, ffmpeg-python
- [x] T003 Initialize frontend project with base dependencies in `frontend/package.json`
- [x] T004 Configure linting tools (flake8/black) in `backend/.flake8` and `backend/pyproject.toml`
- [x] T005 [P] Setup gitignore for both backend and frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T006 Setup environment configuration management in `backend/app/core/config.py`
- [x] T007 Initialize database connection and SQLAlchemy session in `backend/app/core/database.py`
- [x] T008 Setup Alembic migrations framework in `backend/alembic/env.py`
- [x] T009 [P] Initialize base FastAPI application and routing structure in `backend/app/main.py`
- [x] T010 Configure application logging globally in `backend/app/core/logging.py`
- [x] T011 [P] Setup Celery configuration and Redis connection in `backend/app/core/celery_app.py`
- [x] T012 Initialize Boto3/S3 client wrapper in `backend/app/core/storage.py` (for R2 integration)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Submit and Transcode Video (Priority: P1) 🎯 MVP

**Goal**: Core API allowing developers to submit video files for MP4 conversion and receive tracking IDs.

**Independent Test**: Send a video URL via POST to create job; verify the database stores the job, celery worker picks it up, runs ffmpeg to mp4, uploads to R2, and updates job status to completed.

### Implementation for User Story 1

- [x] T013 [P] [US1] Create `User` SQLAlchemy model in `backend/app/models/user.py`
- [x] T014 [P] [US1] Create `ApiKey` SQLAlchemy model in `backend/app/models/api_key.py`
- [x] T015 [P] [US1] Create `Job` SQLAlchemy model in `backend/app/models/job.py`
- [x] T016 [US1] Generate initial Alembic migration for User, ApiKey, and Job models
- [x] T017 [US1] Implement API Key authentication dependency in `backend/app/api/dependencies.py`
- [x] T018 [US1] Implement Job submission schemas (Pydantic) in `backend/app/schemas/job.py`
- [x] T019 [P] [US1] Implement MP4 transcoding logic using ffmpeg-python in `backend/app/worker/transcoder.py`
- [x] T020 [US1] Create Celery task for video processing in `backend/app/worker/tasks.py`
- [x] T021 [US1] Implement POST `/jobs` endpoint to queue jobs in `backend/app/api/endpoints/jobs.py`
- [x] T022 [US1] Implement GET `/jobs/{tracking_id}` endpoint to check status in `backend/app/api/endpoints/jobs.py`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Social Media Smart Presets (Priority: P2)

**Goal**: Support presets like 'tiktok' or 'youtube' for automatic output configuration.

**Independent Test**: Request a transcode using the 'tiktok' preset; verify the FFmpeg logic applies a 9:16 crop/scale and optimal bitrates.

### Implementation for User Story 2

- [x] T023 [P] [US2] Update Job schema to accept `preset` field in `backend/app/schemas/job.py`
- [x] T024 [US2] Define smart preset configurations (resolutions, aspect ratios) in `backend/app/core/presets.py`
- [x] T025 [US2] Update FFmpeg logic to dynamically apply preset filters in `backend/app/worker/transcoder.py`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Adaptive Streaming Generation (Priority: P3)

**Goal**: Support HLS output format generating a master playlist and segment files.

**Independent Test**: Request HLS format; verify worker applies HLS segmentation and uploads the directory of `.m3u8` and `.ts` files to storage.

### Implementation for User Story 3

- [x] T026 [P] [US3] Update Job schema `output_format` to accept 'hls' in `backend/app/schemas/job.py`
- [x] T027 [US3] Implement FFmpeg HLS segmentation arguments logic in `backend/app/worker/transcoder.py`
- [x] T028 [US3] Update storage upload utility to handle uploading full directories for HLS segments in `backend/app/core/storage.py`
- [x] T029 [US3] Update Celery task to return the master playlist URL upon completion in `backend/app/worker/tasks.py`

**Checkpoint**: Transcoder now handles both single file (mp4) and multi-file (HLS) formats natively.

---

## Phase 6: User Story 4 - Asynchronous Webhooks and Job Tracking (Priority: P4)

**Goal**: Send outgoing HTTP webhooks with HMAC signatures upon job completion or failure, including retries.

**Independent Test**: Trigger a job with a webhook URL; verify the endpoint receives a valid JSON payload with a correct HMAC signature when the transcode finishes.

### Implementation for User Story 4

- [x] T030 [P] [US4] Update Job schema to accept `webhook_url` in `backend/app/schemas/job.py`
- [x] T031 [US4] Implement HMAC signature generation utility using the user's API Key or Webhook Secret in `backend/app/core/security.py`
- [x] T032 [US4] Create a Celery task for delivering webhooks (`send_webhook_task`) with `autoretry_for` and exponential backoff in `backend/app/worker/webhooks.py`
- [x] T033 [US4] Update main transcoding Celery task to enqueue the webhook task upon success/failure in `backend/app/worker/tasks.py`

**Checkpoint**: Job lifecycle is now fully observable by external clients.

---

## Phase 7: User Story 5 - Automated Subtitles (Priority: P5)

**Goal**: Automatically generate subtitles from transcoded videos.

**Independent Test**: Submit a job with the subtitle flag enabled; verify the output includes a `.vtt` or `.srt` caption file synchronized to the video.

### Implementation for User Story 5

- [x] T034 [P] [US5] Update Job schemas to accept `generate_subtitles` boolean parameter in `backend/app/schemas/job.py`
- [x] T035 [US5] Implement audio extraction logic using FFmpeg in `backend/app/worker/transcoder.py`
- [x] T036 [US5] Integrate a speech-to-text utility (or external API call wrapper) in `backend/app/worker/subtitles.py`
- [x] T037 [US5] Update main Celery task to upload subtitle files alongside video outputs and store URLs in DB in `backend/app/worker/tasks.py`

**Checkpoint**: Accessibility features integrated.

---

## Phase 8: User Story 6 - Developer Dashboard & API Keys (Priority: P6)

**Goal**: Provide a web dashboard for customers to manage API keys and view usage data.

**Independent Test**: Access the dashboard frontend, fetch usage stats and active API keys, visually verify the data matches the backend state.

### Implementation for User Story 6

- [x] T038 [P] [US6] Create API Key management endpoints (`GET /keys`, `POST /keys`, `DELETE /keys/{id}`) in `backend/app/api/endpoints/keys.py`
- [x] T039 [P] [US6] Create usage statistics aggregation endpoint (`GET /usage`) in `backend/app/api/endpoints/usage.py`
- [x] T040 [P] [US6] Initialize Dashboard routing and layout in `frontend/src/App.jsx`
- [x] T041 [US6] Implement API Key management interface (list, create, revoke) in `frontend/src/components/ApiKeyManager.jsx`
- [x] T042 [US6] Implement Overview dashboard showing job count, processed minutes, and storage in `frontend/src/pages/Dashboard.jsx`

**Checkpoint**: Full end-to-end functionality including developer self-service implemented.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Implement rate limiting and concurrent job queue limits globally in `backend/app/api/deps.py`
- [x] T044 [P] Ensure error messages from failed FFmpeg jobs are sanitized before saving to DB
- [x] T045 Create and verify comprehensive OpenAPI documentation using FastAPI's features
- [ ] T046 Run quickstart validation to verify end-to-end flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US2, US3, US4 depend on basic US1 infrastructure being in place (since they modify the transcode worker logic). 
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent core path.
- **User Story 2 (P2)**: Modifies US1 worker logic.
- **User Story 3 (P3)**: Modifies US1 worker and storage logic.
- **User Story 4 (P4)**: Driven by US1 job completion lifecycle.
- **User Story 5 (P5)**: Independent addition to the US1 worker logic.
- **User Story 6 (P6)**: Relies on API keys and Jobs existence, but endpoints can be built synchronously with worker.

### Parallel Opportunities

- Phase 1 setup tasks can be run in parallel.
- Database Models (US1) can be defined simultaneously.
- User Story 4 (Webhooks) can be primarily implemented independently of US2, US3, US5 since it hooks at the end of the Job task.
- Frontend Dashboard work (US6) can run concurrently with the worker logic enhancements (US2, US3, US5), relying on API contracts.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Ensure a basic task can queue, transcode to MP4, and upload.

### Incremental Delivery

1. Post-MVP, introduce Smart Presets (US2).
2. Follow up with HLS support (US3).
3. Introduce Webhooks (US4) to properly distribute success/failure state.
4. Integrate Subtitle generation (US5).
5. Expose data and settings via Dashboard (US6).
