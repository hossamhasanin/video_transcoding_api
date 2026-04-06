# Quickstart: Playground Tab

**Feature Branch**: `004-playground-tab`
**Date**: 2026-04-06

---

## Prerequisites

- Backend running (`uvicorn app.main:app --reload` or via Docker)
- Frontend running (`cd frontend && npm run dev`)
- An authenticated user account
- At least one active API key (for test job submission)

## Getting Started

### 1. Navigate to the Playground

After logging in, click **"Playground"** in the sidebar navigation (between "Dashboard" and "Settings").

### 2. Configure a Job

Fill in the configuration form on the left panel:

| Option | Control | Notes |
|---|---|---|
| Source URL | Text input | Enter a public video URL; placeholder shown in preview if empty |
| Output Format | MP4 / HLS toggle | Selecting HLS reveals additional options |
| Preset | TikTok / YouTube / Instagram / None | Optional social-media preset |
| Subtitles | Toggle switch | Enable AI subtitle generation |
| Webhook URL | Text input | Optional callback URL |

### 3. Configure HLS Options (if applicable)

When "HLS" is selected, additional controls appear:

- **Segment Duration**: Slider (2–30 seconds, default 10)
- **Codec Preset**: Dropdown (ultrafast → veryslow, default fast)
- **CRF Quality**: Slider (0–51, default 23; lower = better quality)
- **Video Profile**: Dropdown (baseline / main / high, default high)
- **Renditions**: Add custom quality tiers with name, dimensions, and bitrates

### 4. Review the Live Preview

The right panel shows:
- The target endpoint (`POST {base_url}/jobs`)
- Syntax-highlighted JSON payload
- Only non-default fields are shown for a clean payload

### 5. Copy the Request

- **Copy as cURL**: Produces a ready-to-paste terminal command with `$API_KEY` placeholder
- **Copy JSON**: Copies just the raw JSON body

### 6. Submit a Test Job

1. Enter a valid source video URL
2. Click **"Submit Test Job"**
3. The right panel switches to the **Response** tab showing the job ID and status
4. Toggle between **Request** and **Response** tabs to compare

> ⚠️ Test jobs are **live** — they count against your account usage and concurrent job limit.

## Development

### Frontend

```bash
cd frontend
npm run dev          # Start dev server
npm run typecheck    # Verify types
npm test             # Run Vitest suite
```

### Backend

```bash
cd backend
uvicorn app.main:app --reload   # Start with hot-reload
pytest                           # Run test suite
```

### Key Files

| File | Purpose |
|---|---|
| `frontend/src/pages/Playground.tsx` | Page shell with split-pane layout |
| `frontend/src/components/playground/PlaygroundForm.tsx` | Configuration form |
| `frontend/src/components/playground/RequestPreview.tsx` | JSON/cURL preview + copy |
| `frontend/src/components/playground/HlsRenditionEditor.tsx` | Rendition CRUD |
| `frontend/src/hooks/usePlaygroundForm.ts` | Form state management + JSON builder |
| `frontend/src/utils/curlBuilder.ts` | cURL string generation |
| `backend/app/api/endpoints/playground.py` | Test job submission endpoint |
| `backend/app/schemas/playground.py` | Request/response Pydantic schemas |
