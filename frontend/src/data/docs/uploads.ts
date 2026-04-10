import type { DocSection } from './types';

export const uploads: DocSection = {
  id: 'uploads',
  title: 'Uploads',
  description: 'Upload videos via presigned URLs. Use these endpoints when your video isn\'t already hosted at a public URL \u2014 see the Workflow Overview for how uploads fit into the full transcoding flow.',
  icon: 'Upload',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/uploads/presign',
      description: 'Get a presigned URL for direct file upload to R2 storage. Upload the file via PUT to the returned URL, then create a job using the returned upload_id.',
      auth: 'api-key',
      rateLimit: '10/min',
      parameters: [
        { name: 'filename', type: 'string', location: 'body', required: true, defaultValue: null, description: 'Original filename with extension (max 255 chars). Allowed: .mp4, .mov, .webm, .avi, .mkv' },
        { name: 'file_size_bytes', type: 'integer', location: 'body', required: true, defaultValue: null, description: 'Exact file size in bytes (must be > 0)' },
        { name: 'content_type', type: 'string', location: 'body', required: false, defaultValue: 'video/mp4', description: 'MIME type: video/mp4, video/quicktime, video/webm, video/x-msvideo, or video/x-matroska' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl -X POST https://api.transcodeflow.com/api/v1/uploads/presign \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "my-video.mp4",
    "file_size_bytes": 52428800,
    "content_type": "video/mp4"
  }'`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (201 Created)',
        code: `{
  "upload_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "upload_url": "https://bucket.r2.cloudflarestorage.com/...",
  "s3_key": "uploads/user-123/7c9e6679-.../my-video.mp4",
  "source_url": "https://bucket.r2.cloudflarestorage.com/uploads/...",
  "expires_at": "2026-04-10T13:00:00Z",
  "headers": {
    "Content-Type": "video/mp4"
  }
}`,
      },
    },
    {
      method: 'GET',
      path: '/api/v1/uploads/{upload_id}/status',
      description: 'Check the status of a presigned upload. If still pending, checks R2 to detect if the file has been uploaded.',
      auth: 'api-key',
      rateLimit: '30/min',
      parameters: [
        { name: 'upload_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The upload ID from the presign response' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl "https://api.transcodeflow.com/api/v1/uploads/7c9e6679-7425-40de-944b-e07fc1f90ae7/status" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "upload_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "completed",
  "source_url": "https://bucket.r2.cloudflarestorage.com/uploads/...",
  "filename": "my-video.mp4",
  "file_size_bytes": 52428800,
  "content_type": "video/mp4",
  "actual_size_bytes": 52428800,
  "created_at": "2026-04-10T12:00:00Z",
  "expires_at": "2026-04-10T13:00:00Z"
}`,
      },
    },
    {
      method: 'DELETE',
      path: '/api/v1/uploads/{upload_id}',
      description: 'Cancel a pending upload and remove the record. Deletes the R2 object if it exists. Completed uploads cannot be cancelled.',
      auth: 'api-key',
      rateLimit: '10/min',
      parameters: [
        { name: 'upload_id', type: 'string (UUID)', location: 'path', required: true, defaultValue: null, description: 'The upload ID to cancel' },
      ],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl -X DELETE "https://api.transcodeflow.com/api/v1/uploads/7c9e6679-7425-40de-944b-e07fc1f90ae7" \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (204 No Content)',
        code: `// No response body on success`,
      },
    },
  ],
};
