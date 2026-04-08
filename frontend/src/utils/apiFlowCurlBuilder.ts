/**
 * Per-step cURL command builders for the API flow panel.
 * Each function generates a ready-to-copy cURL command for a specific
 * step in the production API integration flow.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export function buildPresignCurl(filename: string, fileSize: number, contentType: string): string {
  const body = JSON.stringify(
    {
      filename,
      file_size_bytes: fileSize,
      content_type: contentType,
    },
    null,
    2,
  );
  return [
    `curl -X POST "${API_BASE}/uploads/presign" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-API-Key: $API_KEY" \\`,
    `  -d '${body}'`,
  ].join("\n");
}

export function buildUploadToR2Curl(contentType: string): string {
  return [
    `curl -X PUT "{PRESIGNED_URL}" \\`,
    `  -H "Content-Type: ${contentType}" \\`,
    `  --data-binary "@video.mp4"`,
  ].join("\n");
}

export function buildPollUploadCurl(uploadId: string): string {
  const id = uploadId || "{upload_id}";
  return [
    `curl -X GET "${API_BASE}/uploads/${id}/status" \\`,
    `  -H "X-API-Key: $API_KEY"`,
  ].join("\n");
}

export function buildCreateJobCurl(body: object): string {
  const jsonBody = JSON.stringify(body, null, 2);
  return [
    `curl -X POST "${API_BASE}/jobs/" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-API-Key: $API_KEY" \\`,
    `  -d '${jsonBody}'`,
  ].join("\n");
}

export function buildPollJobCurl(jobId: string): string {
  const id = jobId || "{job_id}";
  return [
    `curl -X GET "${API_BASE}/jobs/${id}" \\`,
    `  -H "X-API-Key: $API_KEY"`,
  ].join("\n");
}
