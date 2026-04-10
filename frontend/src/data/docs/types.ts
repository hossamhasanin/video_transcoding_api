/**
 * TypeScript interfaces for API documentation data structures.
 * All documentation content is static, compile-time data — no database tables or runtime state.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type AuthType = 'api-key' | 'jwt-bearer' | 'none';

export type ParamLocation = 'query' | 'path' | 'body' | 'header';

export type CodeLanguage = 'curl' | 'json';

export interface ParamEntry {
  /** Parameter name (e.g., "source_url", "page") */
  name: string;
  /** Data type (e.g., "string", "integer", "boolean", "object") */
  type: string;
  /** Where the parameter is sent */
  location: ParamLocation;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value if optional, null if no default */
  defaultValue: string | null;
  /** Plain-language description of what the parameter does */
  description: string;
}

export interface CodeExample {
  /** Language for syntax highlighting */
  language: CodeLanguage;
  /** Display label (e.g., "cURL", "Response (200 OK)", "Request Body") */
  label: string;
  /** Raw code string (used for copy-to-clipboard and highlighting) */
  code: string;
}

export interface EndpointEntry {
  /** HTTP method */
  method: HttpMethod;
  /** URL path (e.g., "/api/v1/jobs/") */
  path: string;
  /** Plain-language description of what the endpoint does */
  description: string;
  /** Authentication type required for this endpoint */
  auth: AuthType;
  /** Rate limit string if applicable (e.g., "10/min"), null if none */
  rateLimit: string | null;
  /** Ordered list of parameters (query, path, body) */
  parameters: ParamEntry[];
  /** Example request (cURL command + optional JSON body) */
  requestExample: CodeExample | null;
  /** Example response (JSON body) */
  responseExample: CodeExample | null;
}

export interface DocSection {
  /** Unique anchor ID for URL hash navigation (e.g., "authentication", "jobs") */
  id: string;
  /** Display title (e.g., "Authentication", "Transcoding Jobs") */
  title: string;
  /** Brief description of what this API domain covers */
  description: string;
  /** lucide-react icon name for sidebar/section heading display */
  icon: string;
  /** Ordered list of endpoints in this section */
  endpoints: EndpointEntry[];
}

export interface GettingStartedStep {
  /** Step heading (e.g., "1. Create an Account") */
  heading: string;
  /** Narrative description */
  content: string;
  /** Optional code example for this step */
  codeExample: CodeExample | null;
}

export interface GettingStartedSection {
  id: string;
  title: string;
  /** lucide-react icon name for sidebar display */
  icon?: string;
  /** Ordered list of steps with optional code examples */
  steps: GettingStartedStep[];
}

export interface DocsConfig {
  /** Page-level metadata */
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogType: string;
  };
  /** Getting Started content (narrative, not endpoint-based) */
  gettingStarted: GettingStartedSection;
  /** Narrative guide sections (workflow, dashboard, webhooks) */
  guideSections: GettingStartedSection[];
  /** Ordered list of API endpoint reference sections */
  sections: DocSection[];
}
