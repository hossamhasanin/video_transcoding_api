import type { GettingStartedSection } from './types';

export const workflowOverview: GettingStartedSection = {
  id: 'workflow-overview',
  title: 'Workflow Overview',
  icon: 'GitBranch',
  steps: [
    {
      heading: 'Input: Provide Your Video',
      content:
        'Two paths to get your video into TranscodeFlow:\n\n**Path A \u2014 Source URL:** If your video is hosted at a public or pre-signed URL, pass it as `source_url` when creating a job. This is the simplest option.\n\n**Path B \u2014 Presigned Upload:** For large files or when you don\'t have a hosted URL, use the three-step upload flow: POST `/uploads/presign` to get a URL, PUT your file to that URL, then verify with GET `/uploads/{upload_id}/status`. Pass the returned `upload_id` when creating your job.',
      codeExample: null,
    },
    {
      heading: 'Process: Create a Transcoding Job',
      content:
        'POST `/jobs/` with your input reference and settings:\n\n- **output_format** \u2014 `mp4` for a single file, `hls` for adaptive streaming\n- **preset** \u2014 `tiktok`, `youtube`, or `instagram` for optimized encoding profiles\n- **generate_subtitles** \u2014 set `true` to extract subtitles via WhisperX\n- **webhook_url** \u2014 optional URL to receive push notifications on completion\n- **hls_template** or **hls_config** \u2014 for HLS output, choose a predefined template (`adaptive_streaming`, `low_bandwidth`, `4k_ultra`, `mobile_only`, `broadcast`) or provide custom rendition settings',
      codeExample: null,
    },
    {
      heading: 'Monitor: Track Progress',
      content:
        'Two strategies for tracking your job:\n\n**Polling** \u2014 GET `/jobs/{tracking_id}` returns current status, progress percentage, and ETA. Poll every 5\u201310 seconds for a responsive experience.\n\n**Real-time (SSE)** \u2014 GET `/jobs/{tracking_id}/events` streams live events: `progress` (with percentage and ETA), `status_change`, `done`, `error`, `cancelled`, and `heartbeat` (keeps the connection alive).\n\nJob statuses: `pending` \u2192 `processing` \u2192 `completed` | `failed` | `cancelled`',
      codeExample: null,
    },
    {
      heading: 'Output: Retrieve Results',
      content:
        'How you access the transcoded output depends on the format:\n\n**MP4** \u2014 `output_url` in the job response is a time-limited presigned download URL. Use it before `output_url_expires_at`.\n\n**HLS** \u2014 `output_url` points to the streaming proxy. Access the master manifest at GET `/jobs/{tracking_id}/stream/master.m3u8` and individual segments via the stream endpoint.\n\n**Subtitles** \u2014 If `generate_subtitles` was enabled, `subtitle_url` provides a presigned download link to the SRT/VTT file.\n\n**HLS Archive** \u2014 `output_zip_url` provides a presigned download of all HLS renditions bundled as a ZIP.',
      codeExample: null,
    },
    {
      heading: 'Notifications: Webhooks (Optional)',
      content:
        'Receive push notifications when jobs complete or fail:\n\n- **Per-job webhook:** Pass `webhook_url` in the job creation request\n- **Default webhook:** Set a default URL in dashboard Settings \u2014 applies to all jobs without an explicit webhook_url\n- **Signature verification:** Each webhook includes an HMAC-SHA256 signature so you can verify it came from TranscodeFlow\n- **Retry logic:** Failed deliveries are retried with exponential backoff\n- **Delivery history:** GET `/jobs/{tracking_id}/deliveries` shows every notification attempt with status codes and timestamps',
      codeExample: null,
    },
  ],
};
