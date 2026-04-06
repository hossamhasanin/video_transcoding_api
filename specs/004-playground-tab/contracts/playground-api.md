# API Contract: Playground Test Job

**Feature Branch**: `004-playground-tab`
**Date**: 2026-04-06

---

## POST /api/v1/playground/test-job

Submit a test transcoding job from the Playground UI. Authenticated via JWT bearer token (session auth). The backend auto-selects the user's first active API key.

### Authentication

- **Method**: Bearer token (JWT)
- **Header**: `Authorization: Bearer <access_token>`
- **Dependency**: `get_current_user` (existing)

> **Note**: This is NOT the canonical job-creation endpoint. The canonical endpoint is
> `POST /api/v1/jobs` authenticated via `X-API-Key`. The playground endpoint exists solely
> to let session-authenticated dashboard users submit test jobs without managing API keys
> in the UI.

### Request

```http
POST /api/v1/playground/test-job HTTP/1.1
Host: api.transcodeflow.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "source_url": "https://example.com/video.mp4",
  "output_format": "hls",
  "preset": "youtube",
  "generate_subtitles": true,
  "webhook_url": "https://hooks.example.com/done",
  "hls_config": {
    "segment_duration": 6,
    "video_codec_preset": "slow",
    "video_crf": 18,
    "video_profile": "high",
    "renditions": [
      {
        "name": "720p",
        "width": 1280,
        "height": 720,
        "video_bitrate": "2500k",
        "audio_bitrate": "128k"
      }
    ]
  }
}
```

#### Request Body Schema

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `source_url` | `string` | ✅ | — | URL of the source video |
| `output_format` | `"mp4" \| "hls"` | No | `"mp4"` | Output format |
| `preset` | `"tiktok" \| "youtube" \| "instagram"` | No | `null` | Social-media preset |
| `generate_subtitles` | `boolean` | No | `false` | Enable subtitle generation |
| `webhook_url` | `string (URL)` | No | `null` | Webhook notification URL |
| `hls_config` | `HLSConfig` | No | `null` | HLS-specific config (ignored for MP4) |

#### HLSConfig Schema

| Field | Type | Required | Default | Constraints | Description |
|---|---|---|---|---|---|
| `segment_duration` | `integer` | No | `10` | 2–30 | Segment duration in seconds |
| `video_codec_preset` | `string` | No | `"fast"` | enum | libx264 preset |
| `video_crf` | `integer` | No | `23` | 0–51 | Constant Rate Factor |
| `video_profile` | `string` | No | `"high"` | baseline/main/high | H.264 profile |
| `renditions` | `RenditionConfig[]` | No | `null` | unique names | Quality renditions |

#### RenditionConfig Schema

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | ✅ | — | Rendition identifier |
| `width` | `integer` | ✅ | — | Video width (px) |
| `height` | `integer` | ✅ | — | Video height (px) |
| `video_bitrate` | `string` | ✅ | — | e.g., "2500k" |
| `audio_bitrate` | `string` | No | `"128k"` | e.g., "128k" |

### Responses

#### 201 Created

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "source_url": "https://example.com/video.mp4",
  "output_format": "hls",
  "preset": "youtube",
  "generate_subtitles": true,
  "webhook_url": "https://hooks.example.com/done",
  "hls_config": { "..." },
  "source_size_bytes": null,
  "output_size_bytes": null,
  "processing_duration_seconds": null,
  "created_at": "2026-04-06T15:00:00Z",
  "updated_at": "2026-04-06T15:00:00Z"
}
```

#### 400 Bad Request — No API Key

```json
{
  "detail": "No active API key found. Please create an API key from the Dashboard before submitting test jobs."
}
```

#### 400 Bad Request — Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "source_url"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### 429 Too Many Requests — Concurrent Limit

```json
{
  "detail": "Concurrent job limit exceeded. Maximum allowable is 3."
}
```

#### 401 Unauthorized

```json
{
  "detail": "Invalid or expired access token"
}
```

---

## Preview Panel Contract (Client-Side Only)

The request preview panel always displays the **canonical** API endpoint and headers, regardless of how submission actually works:

```http
POST {VITE_API_URL}/jobs
X-API-Key: $API_KEY
Content-Type: application/json
```

This teaches developers the real integration pattern they'll use in their own code.
