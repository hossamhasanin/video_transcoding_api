/**
 * Builds a ready-to-use cURL command string from an API base URL and a JSON
 * body object. The output uses the canonical `POST /jobs` endpoint with
 * `X-API-Key: $API_KEY` placeholder so developers see the real integration
 * pattern.
 */

export function buildCurlCommand(
  apiBaseUrl: string,
  body: object,
): string {
  const endpoint = `${apiBaseUrl}/jobs`;
  const jsonBody = JSON.stringify(body, null, 2);

  return [
    `curl -X POST "${endpoint}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-API-Key: $API_KEY" \\`,
    `  -d '${jsonBody}'`,
  ].join("\n");
}
