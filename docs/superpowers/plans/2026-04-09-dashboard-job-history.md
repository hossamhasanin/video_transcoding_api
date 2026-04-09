# Dashboard Job History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a filterable, paginated job history table with expandable row details to the dashboard.

**Architecture:** New JWT-authed backend endpoint (`GET /dashboard/jobs`) reuses the Job model and existing pagination/filtering patterns. Frontend adds a SWR hook and a `JobHistory` component with inline filter bar, expandable rows, and pagination. Integrated into the existing Dashboard page.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic (backend) / React 19, SWR, Tailwind CSS v4, TypeScript (frontend)

---

### Task 1: Backend — Add PaginatedDashboardJobResponse schema

**Files:**
- Modify: `backend/app/schemas/job.py` (append after line 119)

- [ ] **Step 1: Add the new response schema to `job.py`**

Append the following after the existing `PaginatedJobResponse` class (after line 119):

```python
class PaginatedDashboardJobResponse(BaseModel):
    items: List[JobResponse]
    total: int
    limit: int
    offset: int
```

- [ ] **Step 2: Verify import works**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api && docker compose exec api python -c "from app.schemas.job import PaginatedDashboardJobResponse; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/job.py
git commit -m "feat: add PaginatedDashboardJobResponse schema for dashboard job listing"
```

---

### Task 2: Backend — Create dashboard jobs endpoint

**Files:**
- Create: `backend/app/api/endpoints/dashboard.py`

- [ ] **Step 1: Create the dashboard endpoint file**

Create `backend/app/api/endpoints/dashboard.py` with the following content:

```python
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobResponse, PaginatedDashboardJobResponse
from app.api.dependencies import get_current_user
from app.core.rate_limit import limiter

router = APIRouter()


@router.get(
    "/jobs",
    response_model=PaginatedDashboardJobResponse,
    summary="List jobs for dashboard",
    description="Retrieves a paginated list of jobs for the authenticated user. "
    "Supports filtering by status, output format, preset, and date range. "
    "Results are sorted by creation date, newest first.",
)
@limiter.limit("30/minute")
def list_dashboard_jobs(
    request: Request,
    status: Optional[str] = Query(
        None, description="Filter by status: pending, processing, transcoding, uploading, completed, failed, cancelled"
    ),
    output_format: Optional[str] = Query(
        None, description="Filter by output format: mp4, hls"
    ),
    preset: Optional[str] = Query(
        None, description="Filter by preset: tiktok, youtube, instagram"
    ),
    created_after: Optional[datetime] = Query(
        None, description="Filter jobs created after this ISO 8601 datetime"
    ),
    created_before: Optional[datetime] = Query(
        None, description="Filter jobs created before this ISO 8601 datetime"
    ),
    limit: int = Query(50, ge=1, le=100, description="Number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.user_id == current_user.id)

    if status is not None:
        query = query.filter(Job.status == status)
    if output_format is not None:
        query = query.filter(Job.output_format == output_format)
    if preset is not None:
        query = query.filter(Job.preset == preset)
    if created_after is not None:
        query = query.filter(Job.created_at >= created_after)
    if created_before is not None:
        query = query.filter(Job.created_at <= created_before)

    total = query.count()

    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    return PaginatedDashboardJobResponse(
        items=jobs, total=total, limit=limit, offset=offset
    )
```

- [ ] **Step 2: Verify import works**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api && docker compose exec api python -c "from app.api.endpoints.dashboard import router; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/endpoints/dashboard.py
git commit -m "feat: add GET /dashboard/jobs endpoint with JWT auth and filtering"
```

---

### Task 3: Backend — Register dashboard router in main.py

**Files:**
- Modify: `backend/app/main.py` (lines 8 and 48)

- [ ] **Step 1: Add import for dashboard module**

In `backend/app/main.py`, on line 8, add `dashboard` to the imports:

```python
from app.api.endpoints import auth, jobs, keys, usage, playground, uploads, dashboard
```

- [ ] **Step 2: Register the dashboard router**

After line 48 (the usage router), add:

```python
app.include_router(
    dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"]
)
```

- [ ] **Step 3: Verify lint and format pass**

Run:
```bash
cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/backend
flake8 app/main.py --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 app/main.py --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics
black --check --diff app/main.py
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register dashboard router in FastAPI app"
```

---

### Task 4: Frontend — Add Job and PaginatedJobResponse types

**Files:**
- Modify: `frontend/src/types/index.ts` (append after line 34, after UsageStats)

- [ ] **Step 1: Add the types**

Append after the `UsageStats` interface (after line 34):

```typescript
export interface Job {
  id: string
  status: string
  source_url: string
  webhook_url: string | null
  preset: string | null
  output_format: string
  generate_subtitles: boolean
  subtitle_url: string | null
  hls_config: Record<string, unknown> | null
  source_size_bytes: number | null
  output_size_bytes: number | null
  processing_duration_seconds: number | null
  created_at: string
  updated_at: string
}

export interface PaginatedJobResponse {
  items: Job[]
  total: number
  limit: number
  offset: number
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add Job and PaginatedJobResponse frontend types"
```

---

### Task 5: Frontend — Create useJobs SWR hook

**Files:**
- Create: `frontend/src/hooks/useJobs.ts`

- [ ] **Step 1: Create the hook file**

Create `frontend/src/hooks/useJobs.ts` with:

```typescript
import useSWR from 'swr'
import type { AxiosError } from 'axios'
import type { PaginatedJobResponse } from '../types'

export interface JobFilters {
  status?: string
  output_format?: string
  preset?: string
  created_after?: string
  created_before?: string
}

interface UseJobsOptions {
  filters: JobFilters
  page: number
  pageSize: number
}

export function useJobs({ filters, page, pageSize }: UseJobsOptions) {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.output_format) params.set('output_format', filters.output_format)
  if (filters.preset) params.set('preset', filters.preset)
  if (filters.created_after) params.set('created_after', filters.created_after)
  if (filters.created_before) params.set('created_before', filters.created_before)

  params.set('limit', String(pageSize))
  params.set('offset', String((page - 1) * pageSize))

  const qs = params.toString()
  const key = `/dashboard/jobs${qs ? `?${qs}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<PaginatedJobResponse, AxiosError>(
    key,
    {
      errorRetryCount: 2,
      revalidateOnFocus: false,
    },
  )

  return {
    jobs: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useJobs.ts
git commit -m "feat: add useJobs SWR hook for dashboard job listing"
```

---

### Task 6: Frontend — Create JobHistory component (table + filters)

**Files:**
- Create: `frontend/src/components/JobHistory.tsx`

This is the largest task. The component includes filter bar, table, expandable rows, and pagination all in one focused component.

- [ ] **Step 1: Create the component file**

Create `frontend/src/components/JobHistory.tsx` with the following content:

```tsx
import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Job } from '../types'
import { useJobs, type JobFilters } from '../hooks/useJobs'
import { getErrorMessage } from '../utils/http'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'transcoding', label: 'Transcoding' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const FORMAT_OPTIONS = [
  { value: '', label: 'All Formats' },
  { value: 'mp4', label: 'MP4' },
  { value: 'hls', label: 'HLS' },
]

const PRESET_OPTIONS = [
  { value: '', label: 'All Presets' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }): ReactNode {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-yellow-50 text-yellow-700',
    transcoding: 'bg-yellow-50 text-yellow-700',
    uploading: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-success-bg text-success-text',
    failed: 'bg-danger-bg text-danger-text',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

function ExpandedRow({ job }: { job: Job }): ReactNode {
  const isFailed = job.status === 'failed'
  const borderColor = isFailed ? 'border-l-[#dc3545]' : 'border-l-brand'
  const bgColor = isFailed ? 'bg-[#fff5f5]' : 'bg-[#f0f4f8]'

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className={`${bgColor} p-3 px-4 border-l-[3px] ${borderColor}`}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Source URL</span>
              <span className="font-mono text-xs break-all">{job.source_url}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Output URL</span>
              <span className="font-mono text-xs break-all text-brand">{job.status === 'completed' ? 'Available in API response' : '—'}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Processing Time</span>
              <span className="text-base font-semibold text-[#1a1a1a]">
                {job.processing_duration_seconds !== null ? Math.round(job.processing_duration_seconds) : '—'}
              </span>
              {job.processing_duration_seconds !== null && (
                <span className="text-xs text-[#6c757d]"> seconds</span>
              )}
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">File Size</span>
              <span>
                {formatBytes(job.source_size_bytes)}{job.output_size_bytes !== null ? ` → ${formatBytes(job.output_size_bytes)}` : ''}
              </span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Subtitle</span>
              <span>{job.generate_subtitles ? (job.subtitle_url ? 'Generated' : 'Pending') : 'Not requested'}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Error</span>
              {isFailed && job.error_message ? (
                <span className="text-[#dc3545] font-mono text-xs break-all">{job.error_message}</span>
              ) : (
                <span className="text-[#28a745]">—</span>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function JobHistory(): ReactNode {
  const [filters, setFilters] = useState<JobFilters>({})
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { jobs, total, isLoading, error } = useJobs({ filters, page, pageSize: PAGE_SIZE })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const updateFilter = useCallback((key: keyof JobFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value) {
        next[key] = value
      } else {
        delete next[key]
      }
      return next
    })
    setPage(1)
    setExpandedId(null)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setPage(1)
    setExpandedId(null)
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  return (
    <div>
      <h2 className="mb-3">Job History</h2>

      {/* Filter bar */}
      <div className="bg-white rounded-lg p-2.5 px-3.5 mb-2 flex gap-2 items-center flex-wrap border border-[#e0e0e0]">
        <span className="text-xs text-[#6c757d] font-semibold">Filters:</span>

        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.output_format ?? ''}
          onChange={(e) => updateFilter('output_format', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.preset ?? ''}
          onChange={(e) => updateFilter('preset', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input
          type="date"
          value={filters.created_after ?? ''}
          onChange={(e) => updateFilter('created_after', e.target.value ? `${e.target.value}T00:00:00` : '')}
          placeholder="From"
          className="p-1 px-2 border border-[#ccc] rounded text-xs w-[130px]"
        />
        <input
          type="date"
          value={filters.created_before ?? ''}
          onChange={(e) => updateFilter('created_before', e.target.value ? `${e.target.value}T23:59:59` : '')}
          placeholder="To"
          className="p-1 px-2 border border-[#ccc] rounded text-xs w-[130px]"
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto p-1 px-2.5 bg-[#dc3545] text-white border-none rounded text-xs cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-danger-bg text-danger-text p-2.5 rounded mb-2">
          {getErrorMessage(error, 'Something went wrong while loading jobs.')}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden border border-[#e0e0e0]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f8f9fa] border-b-2 border-[#dee2e6]">
              <th className="p-2 px-3 text-left w-6"></th>
              <th className="p-2 px-3 text-left">ID</th>
              <th className="p-2 px-3 text-left">Status</th>
              <th className="p-2 px-3 text-left">Preset</th>
              <th className="p-2 px-3 text-left">Format</th>
              <th className="p-2 px-3 text-left">Created</th>
              <th className="p-2 px-3 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-[#6c757d]">
                  Loading jobs...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-[#6c757d]">
                  No jobs found{hasActiveFilters ? ' with current filters' : ''}.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isExpanded={expandedId === job.id}
                  onToggle={toggleExpand}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="p-2 px-3 flex justify-between items-center border-t border-[#eee] text-xs text-[#6c757d]">
            <span>Showing {start}-{end} of {total}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 px-2 border border-[#ccc] rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="p-1 px-2 text-[#6c757d]">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`p-1 px-2 border border-[#ccc] rounded ${p === page ? 'bg-brand text-white' : 'bg-white'}`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 px-2 border border-[#ccc] rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job row component (separated to keep main component clean)
// ---------------------------------------------------------------------------

function JobRow({
  job,
  isExpanded,
  onToggle,
}: {
  job: Job
  isExpanded: boolean
  onToggle: (id: string) => void
}): ReactNode {
  return (
    <>
      <tr
        onClick={() => onToggle(job.id)}
        className={`border-b border-[#eee] cursor-pointer hover:bg-[#f8f9fa] ${isExpanded ? 'bg-[#f8f9fa]' : ''}`}
      >
        <td className="p-1.5 px-3 text-[#6c757d] text-xs">{isExpanded ? '▼' : '▶'}</td>
        <td className="p-1.5 px-3 font-mono text-xs">{job.id.slice(0, 8)}...</td>
        <td className="p-1.5 px-3"><StatusBadge status={job.status} /></td>
        <td className="p-1.5 px-3">{job.preset ?? '—'}</td>
        <td className="p-1.5 px-3">{job.output_format}</td>
        <td className="p-1.5 px-3 text-[#6c757d]">{formatRelativeTime(job.created_at)}</td>
        <td className="p-1.5 px-3">{formatDuration(job.processing_duration_seconds)}</td>
      </tr>
      {isExpanded && <ExpandedRow job={job} />}
    </>
  )
}

export default JobHistory
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify lint passes**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend && npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/JobHistory.tsx
git commit -m "feat: add JobHistory component with filters, expandable rows, and pagination"
```

---

### Task 7: Frontend — Integrate JobHistory into Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add import and component**

In `frontend/src/pages/Dashboard.tsx`:

Add import on line 2 (after the ApiKeyManager import):
```typescript
import JobHistory from '../components/JobHistory'
```

Add the component before the closing `</div>` on line 51 (before the last `</div>`), after `<ApiKeyManager />`:

```tsx
      <div className="mt-10">
        <JobHistory />
      </div>
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: integrate JobHistory component into dashboard page"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full backend lint + format check**

```bash
cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/backend
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics
black --check --diff .
```
Expected: No errors.

- [ ] **Step 2: Run full frontend checks**

```bash
cd /Users/alhonsh.fit/projects/backend/video_transcoding_api/frontend
npm run typecheck
npm run lint
```
Expected: Both pass.

- [ ] **Step 3: Manual verification**

1. Start the app: `docker compose up -d` + `cd frontend && npm run dev`
2. Login and navigate to the dashboard
3. Verify the Job History table appears below API Keys
4. Test filter dropdowns change the table contents
5. Test date inputs filter by date range
6. Test clicking a row expands it with the 3-column detail panel
7. Test pagination (if enough jobs exist)
8. Test clear button resets all filters
