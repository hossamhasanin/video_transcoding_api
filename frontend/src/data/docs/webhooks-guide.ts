import type { GettingStartedSection } from './types';

export const webhooksGuide: GettingStartedSection = {
  id: 'webhooks-guide',
  title: 'Webhooks Guide',
  icon: 'Webhook',
  steps: [
    {
      heading: 'Configuring Webhooks',
      content:
        'Set a default webhook URL in the dashboard Settings page. This URL receives notifications for all jobs. To use a different URL for a specific job, pass `webhook_url` in the POST `/jobs/` request body \u2014 this overrides the default for that job only.',
      codeExample: {
        language: 'curl',
        label: 'Per-job Webhook URL',
        code: `curl -X POST https://api.transcodeflow.com/api/v1/jobs/ \\
  -H "X-API-Key: vf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_url": "https://example.com/video.mp4",
    "output_format": "mp4",
    "webhook_url": "https://yourapp.com/hooks/transcode-done"
  }'`,
      },
    },
    {
      heading: 'Webhook Payload Format',
      content:
        'TranscodeFlow sends POST requests to your URL with a JSON body. The payload includes the event type, job ID, current status, and timestamp.',
      codeExample: {
        language: 'json',
        label: 'Example Payload',
        code: `{
  "event": "job.completed",
  "tracking_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "output_format": "mp4",
  "timestamp": "2026-04-10T12:05:30Z"
}`,
      },
    },
    {
      heading: 'Verifying Signatures',
      content:
        'Every webhook request includes a signature header that lets you verify the payload came from TranscodeFlow. Compute an HMAC-SHA256 digest of the raw request body using your webhook signing secret (found in dashboard Settings), then compare it to the signature header. Reject any request where the signatures don\'t match.',
      codeExample: {
        language: 'json',
        label: 'Signature Verification (Python Example)',
        code: `import hmac, hashlib

secret = "your_webhook_signing_secret"
payload = request.raw_body  # raw bytes, not parsed JSON
signature = request.headers["X-TranscodeFlow-Signature"]

expected = hmac.new(
    secret.encode(), payload, hashlib.sha256
).hexdigest()

if not hmac.compare_digest(expected, signature):
    return "Invalid signature", 403`,
      },
    },
    {
      heading: 'Retry Behavior',
      content:
        'If your endpoint returns a non-2xx status code or doesn\'t respond, TranscodeFlow retries the delivery with exponential backoff. You can inspect all delivery attempts for a job using the deliveries endpoint \u2014 each attempt records the HTTP status code, response body, and timestamp.',
      codeExample: {
        language: 'curl',
        label: 'Check Delivery History',
        code: `curl "https://api.transcodeflow.com/api/v1/jobs/{tracking_id}/deliveries" \\
  -H "X-API-Key: vf_your_api_key_here"`,
      },
    },
    {
      heading: 'Responding to Webhooks',
      content:
        'Your endpoint must return a 2xx status code to acknowledge receipt. Any other response triggers a retry. Keep your handler fast \u2014 acknowledge immediately and process the event asynchronously. This prevents timeouts and ensures reliable delivery.',
      codeExample: null,
    },
  ],
};
