import type { DocSection } from './types';

export const jobs: DocSection = {
  id: 'jobs',
  title: 'Transcoding Jobs',
  description: 'The core API for submitting, monitoring, and managing transcoding jobs. See the Workflow Overview for the full lifecycle.',
  icon: 'Film',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/jobs/',
      description: 'Submit a new transcoding job. Provide a source video URL or an upload_id from the uploads endpoint. Supports MP4 and HLS output formats with optional subtitle generation.',
      auth: 'api-key',
      rateLimit: '10/min',
      parameters: [
        { name: 'source_url', type: 'string', location: 'body', required: false, defaultValue: null, description: 'Direct URL to the source video (mutually exclusive with upload_id)' },
        { name: 'upload_id', type: 'string (UUID)', location: 'body', required: false, defaultValue: null, description: 'Upload ID from presigned upload flow (mutually exclusive with source_url)' },
        { name: 'output_format', type: 'string', location: 'body', required: false, defaultValue: 'mp4', description: 'Output format: "mp4" or "hls"' },
        { name: 'preset', type: 'string', location: 'body', required: false, defaultValue: null, description: 'Encoding preset: "tiktok", "youtube", or "instagram"' },
        { name: 'webhook_url', type: 'string', location: 'body', required: false, defaultValue: null, description: 'URL to receive job completion/failure notifications' },
        { name: 'generate_subtitles', type: 'boolean', location: 'body', required: false, defaultValue: 'false', description: 'Whether to generate subtitles using WhisperX' },
        { name: 'hls_config', type: 'object', location: 'body', required: false, defaultValue: null, description: 'Custom HLS configuration (renditions, segment duration, codec settings). Mutually exclusive with hls_template.' },
        { name: 'hls_template', type: 'string', location: 'body', required: false, defaultValue: null, description: 'Predefined HLS template: "adaptive_streaming", "low_bandwidth", "4k_ultra", "mobile_only", or "broadcast". Mutually exclusive with hls_config.' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl -X POST https://api.transcodeflow.com/api/v1/jobs/ \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_url": "https://example.com/video.mp4",
    "output_format": "mp4",
    "preset": "youtube",
    "webhook_url": "https://example.com/webhook"
  }'`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (201 Created)',
        code: `{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "pending",
  "source_url": "https://example.com/video.mp4",
  "webhook_url": "https://example.com/webhook",
  "preset": "youtube",
  "output_format": "mp4",
  "generate_subtitles": false,
  "subtitle_url": null,
  "hls_config": null,
  "source_size_bytes": null,
  "output_size_bytes": null,
  "processing_duration_seconds": null,
  "error_message": null,
  "created_at": "2026-04-10T12:00:00Z",
  "updated_at": "2026-04-10T12:00:00Z"
}`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/',
      description: 'List transcoding jobs for the authenticated user. Supports filtering by status, format, and preset with pagination.',
      auth: 'api-key',
      rateLimit: '30/min',
      parameters: [
        { name: 'status', type: 'string', location: 'query', required: false, defaultValue: null, description: 'Filter by status: "pending", "processing", "completed", "failed"' },
        { name: 'output_format', type: 'string', location: 'query', required: false, defaultValue: null, description: 'Filter by format: "mp4" or "hls"' },
        { name: 'preset', type: 'string', location: 'query', required: false, defaultValue: null, description: 'Filter by preset: "tiktok", "youtube", or "instagram"' },
        { name: 'limit', type: 'integer', location: 'query', required: false, defaultValue: '50', description: 'Number of jobs to return (1-100)' },
        { name: 'offset', type: 'integer', location: 'query', required: false, defaultValue: '0', description: 'Number of jobs to skip for pagination' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl "https://api.transcodeflow.com/api/v1/jobs/?status=completed&limit=10" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "status": "completed",
      "source_url": "https://example.com/video.mp4",
      "output_format": "mp4",
      "created_at": "2026-04-10T12:00:00Z",
      "updated_at": "2026-04-10T12:05:30Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{tracking_id}',
      description: 'Get detailed status of a specific transcoding job. For completed MP4 jobs, output_url is a time-limited presigned URL. For HLS jobs, it returns a streaming proxy URL.',
      auth: 'api-key',
      rateLimit: '30/min',
      parameters: [
        { name: 'tracking_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The job ID returned when the job was created' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl "https://api.transcodeflow.com/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "source_url": "https://example.com/video.mp4",
  "output_url": "https://storage.example.com/output.mp4?X-Amz-...",
  "output_url_expires_at": "2026-04-10T13:00:00Z",
  "output_format": "mp4",
  "generate_subtitles": false,
  "subtitle_url": null,
  "source_size_bytes": 52428800,
  "output_size_bytes": 31457280,
  "processing_duration_seconds": 42.5,
  "error_message": null,
  "progress": null,
  "eta_seconds": null,
  "created_at": "2026-04-10T12:00:00Z",
  "updated_at": "2026-04-10T12:00:42Z"
}`,
      },
    },
    {
      method: 'POST',
      path: '/api/v1/jobs/{tracking_id}/cancel',
      description: 'Cancel a pending or in-progress transcoding job. Completed, failed, or already cancelled jobs cannot be cancelled.',
      auth: 'api-key',
      rateLimit: '10/min',
      parameters: [
        { name: 'tracking_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The job ID to cancel' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl -X POST "https://api.transcodeflow.com/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "cancelled",
  "message": "Job f47ac10b-58cc-4372-a567-0e02b2c3d479 cancelled successfully."
}`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{tracking_id}/events',
      description: 'Stream real-time job events via Server-Sent Events (SSE). Event types: progress, status_change, done, error, cancelled, heartbeat.',
      auth: 'api-key',
      rateLimit: null,
      parameters: [
        { name: 'tracking_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The job ID to monitor' },
        { name: 'api_key', type: 'string', location: 'query', required: false, defaultValue: null, description: 'API key for authentication (alternative to X-API-Key header)' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl -N "https://api.transcodeflow.com/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/events" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'SSE Event Stream',
        code: `event: progress
data: {"progress": 45, "eta_seconds": 30}

event: progress
data: {"progress": 80, "eta_seconds": 10}

event: done
data: {"status": "completed"}`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{tracking_id}/stream/{file_path}',
      description: 'Stream transcoded HLS content. Proxies HLS manifests from R2 storage and returns presigned URLs for media segments.',
      auth: 'api-key',
      rateLimit: '120/min',
      parameters: [
        { name: 'tracking_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The completed job ID' },
        { name: 'file_path', type: 'string', location: 'path', required: true, defaultValue: null, description: 'Path to the HLS file (e.g., "master.m3u8", "720p/segment001.ts")' },
        { name: 'api_key', type: 'string', location: 'query', required: false, defaultValue: null, description: 'API key for authentication (alternative to X-API-Key header)' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl "https://api.transcodeflow.com/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/stream/master.m3u8" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (HLS Manifest)',
        code: `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/variant.m3u8?api_key=YOUR_API_KEY
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
480p/variant.m3u8?api_key=YOUR_API_KEY`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{tracking_id}/deliveries',
      description: 'List webhook delivery attempts for a specific job. Shows the history of webhook notifications sent.',
      auth: 'api-key',
      rateLimit: '30/min',
      parameters: [
        { name: 'tracking_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The job ID to query deliveries for' },
        { name: 'limit', type: 'integer', location: 'query', required: false, defaultValue: '50', description: 'Number of deliveries to return (1-100)' },
        { name: 'offset', type: 'integer', location: 'query', required: false, defaultValue: '0', description: 'Number of deliveries to skip' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl "https://api.transcodeflow.com/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/deliveries" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "items": [
    {
      "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "event_type": "job.completed",
      "status_code": 200,
      "delivered_at": "2026-04-10T12:05:31Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}`,
      },
    },
  ],
};
