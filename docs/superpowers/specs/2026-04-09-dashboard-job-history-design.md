# Dashboard Job History

**Date:** 2026-04-09
**Status:** Approved

## Context

The dashboard currently shows aggregate stats (Total Jobs, Completed, Failed, Storage, Processing Time) but has no way to browse individual jobs. Users need to see their job history with filtering to monitor progress, debug failures, and track usage.

## Design Decisions

- **Separate dashboard endpoint** rather than modifying the existing API-key-authed `GET /jobs`. The existing endpoint serves programmatic clients; the dashboard serves the JWT-authed frontend with potentially different response shapes in the future.
- **Inline expandable rows** rather than separate detail pages. Keeps users on the dashboard without navigation churn.
- **Filter bar above table** (Option A from mockups) — horizontal dropdown selects. Always visible, fits the existing card style.
- **3-column detail grid** in expanded rows with Processing Time as a prominent dedicated column.

## Backend

### New Endpoint: `GET /api/v1/dashboard/jobs`

- **Auth:** JWT via `get_current_user()` dependency
- **Filters (query params):**
  - `status` — optional, one of: pending, processing, transcoding, uploading, completed, failed, cancelled
  - `output_format` — optional, one of: mp4, hls
  - `preset` — optional, one of: tiktok, youtube, instagram
  - `created_after` — optional, ISO 8601 datetime
  - `created_before` — optional, ISO 8601 datetime
- **Pagination:**
  - `limit` — int, 1-100, default 50
  - `offset` — int, >= 0, default 0
- **Sorting:** `created_at DESC`
- **Rate limit:** 30/minute
- **Response:** `PaginatedDashboardJobResponse`

### Schema: `PaginatedDashboardJobResponse`

```python
class PaginatedDashboardJobResponse(BaseModel):
    items: list[JobResponse]
    total: int
    limit: int
    offset: int
```

Reuses existing `JobResponse` schema from `backend/app/schemas/job.py`.

### Files

- **Create:** `backend/app/api/endpoints/dashboard.py` — new router with the endpoint
- **Edit:** `backend/app/schemas/job.py` — add `PaginatedDashboardJobResponse`
- **Edit:** `backend/app/main.py` — register `/api/v1/dashboard` router

## Frontend

### Hook: `useJobs` (`frontend/src/hooks/useJobs.ts`)

- SWR-based, same pattern as `useUsageStats`
- Builds query string from filter/pagination params
- Returns `{ jobs, total, isLoading, error }`

### Component: `JobHistory` (`frontend/src/components/JobHistory.tsx`)

**Filter bar:**
- 3 `<select>` dropdowns: status, format, preset
- 2 date `<input>` fields: created_after, created_before
- Clear button to reset all filters

**Table columns:**
- Expand arrow (▶/▼)
- ID (first 8 chars of UUID, monospace)
- Status (color-coded badge: green=completed, yellow=processing, red=failed, gray=pending)
- Preset (or "—")
- Format (mp4/hls)
- Created (relative time, e.g. "2 min ago")
- Duration (processing_duration_seconds formatted, or "—")

**Expanded row (3-column grid):**
| Source URL | Output URL | Processing Time |
| File Size | Subtitle | Error |

- Blue left border for completed/processing rows
- Red left border for failed rows
- Only one row expanded at a time
- Entire row is clickable

**Pagination:**
- "Showing X-Y of Z" text
- Prev/Next buttons + page number buttons

**States:**
- Loading: skeleton/placeholder rows
- Empty: centered message "No jobs found"
- Error: styled error banner using `getErrorMessage` helper

### Dashboard Integration

Edit `frontend/src/pages/Dashboard.tsx` — add `<JobHistory />` below existing stats cards and `ApiKeyManager`.

### Files

- **Create:** `frontend/src/hooks/useJobs.ts`
- **Create:** `frontend/src/components/JobHistory.tsx`
- **Edit:** `frontend/src/pages/Dashboard.tsx`

## Verification

1. Backend import check: `python -c "from app.api.endpoints.dashboard import router"`
2. Backend lint/format: `flake8` + `black --check`
3. Frontend typecheck: `npm run typecheck`
4. Frontend lint: `npm run lint`
5. Manual: login → dashboard → verify table loads, filters work, rows expand, pagination works
