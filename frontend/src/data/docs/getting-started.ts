import type { GettingStartedSection } from './types';

export const gettingStarted: GettingStartedSection = {
  id: 'getting-started',
  title: 'Getting Started',
  icon: 'Rocket',
  steps: [
    {
      heading: '1. Create Your Account',
      content:
        'Sign up at the TranscodeFlow dashboard. You\'ll receive a verification email \u2014 confirm your address to activate your account. Account registration and login are handled through the dashboard, not the API.',
      codeExample: null,
    },
    {
      heading: '2. Get Your API Key',
      content:
        'Log in to the dashboard, navigate to Settings, and create an API key. Copy it immediately \u2014 the full key is shown only once. Every API request requires this key in the X-API-Key header.',
      codeExample: {
        language: 'curl',
        label: 'Using Your API Key',
        code: `# Every request to the API includes this header:
-H "X-API-Key: vf_your_api_key_here"`,
      },
    },
    {
      heading: '3. Upload a Video (Optional)',
      content:
        'If your video isn\'t already hosted at a public URL, use the presigned upload flow. Request a presigned URL, upload your file directly to storage, then verify the upload. Skip this step if you\'re using a source_url instead.',
      codeExample: {
        language: 'curl',
        label: 'cURL \u2014 Presigned Upload Flow',
        code: `# Step 1: Request a presigned URL
curl -X POST https://api.transcodeflow.com/api/v1/uploads/presign \\
  -H "X-API-Key: vf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "my-video.mp4",
    "file_size_bytes": 52428800,
    "content_type": "video/mp4"
  }'

# Step 2: Upload the file to the returned upload_url
curl -X PUT "https://bucket.r2.cloudflarestorage.com/..." \\
  -H "Content-Type: video/mp4" \\
  --data-binary @my-video.mp4

# Step 3: Verify the upload completed
curl "https://api.transcodeflow.com/api/v1/uploads/{upload_id}/status" \\
  -H "X-API-Key: vf_your_api_key_here"`,
      },
    },
    {
      heading: '4. Create a Transcoding Job',
      content:
        'Submit a job with your video source \u2014 either an upload_id from step 3 or a source_url. Choose your output format (mp4 or hls), optionally apply a preset, and enable subtitles if needed.',
      codeExample: {
        language: 'curl',
        label: 'cURL \u2014 Create Job',
        code: `curl -X POST https://api.transcodeflow.com/api/v1/jobs/ \\
  -H "X-API-Key: vf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_url": "https://example.com/video.mp4",
    "output_format": "mp4",
    "preset": "youtube",
    "webhook_url": "https://example.com/webhook"
  }'`,
      },
    },
    {
      heading: '5. Monitor Progress',
      content:
        'Poll the job status endpoint for updates, or connect to the SSE event stream for real-time progress with ETA. When the job completes, the response includes your download URL.',
      codeExample: {
        language: 'curl',
        label: 'cURL \u2014 Check Status',
        code: `# Poll for status
curl "https://api.transcodeflow.com/api/v1/jobs/{tracking_id}" \\
  -H "X-API-Key: vf_your_api_key_here"

# Or stream real-time events (SSE)
curl -N "https://api.transcodeflow.com/api/v1/jobs/{tracking_id}/events" \\
  -H "X-API-Key: vf_your_api_key_here"`,
      },
    },
    {
      heading: '6. Download the Output',
      content:
        'For MP4 jobs: the output_url in the status response is a time-limited presigned download URL. For HLS jobs: use the stream proxy endpoint to access manifests and segments. If you enabled subtitles, subtitle_url provides a download link.',
      codeExample: {
        language: 'json',
        label: 'Completed Job Response',
        code: `{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "output_url": "https://storage.example.com/output.mp4?X-Amz-...",
  "output_url_expires_at": "2026-04-10T13:00:00Z",
  "output_format": "mp4",
  "output_size_bytes": 31457280,
  "processing_duration_seconds": 42.5
}`,
      },
    },
    {
      heading: '7. Next Steps',
      content:
        'You\'re ready to integrate TranscodeFlow into your application. Check out the Workflow Overview for the full lifecycle reference, the Webhooks Guide for push notifications, and the API reference sections below for complete endpoint details.',
      codeExample: null,
    },
  ],
};
