import type { DocSection } from './types';

export const usage: DocSection = {
  id: 'usage',
  title: 'Usage & Stats',
  description: 'Aggregated usage metrics including job counts, storage, and processing time. Also available in the dashboard.',
  icon: 'BarChart3',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/usage/',
      description: 'Fetch aggregated usage statistics for the authenticated user. Returns total and completed/failed job counts, storage used, and processing time.',
      auth: 'api-key',
      rateLimit: null,
      parameters: [],
      requestExample: {
        language: 'curl',
        label: 'cURL',
        code: `curl https://api.transcodeflow.com/api/v1/usage/ \\
  -H "X-API-Key: YOUR_API_KEY"`,
      },
      responseExample: {
        language: 'json',
        label: 'Response (200 OK)',
        code: `{
  "total_jobs": 42,
  "completed_jobs": 38,
  "failed_jobs": 4,
  "storage_used_bytes": 2147483648,
  "processed_minutes": 127.45
}`,
      },
    },
  ],
};
