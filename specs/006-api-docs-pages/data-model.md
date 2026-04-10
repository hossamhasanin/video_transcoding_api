# Data Model: API Documentation Pages

**Feature**: 006-api-docs-pages  
**Date**: 2026-04-10

## Overview

All data entities are TypeScript interfaces defined in `frontend/src/data/docs/types.ts`. These are static, compile-time data structures — no database tables or runtime state. Content is hand-curated in TypeScript data files under `src/data/docs/`.

---

## Entities

### DocSection

A logical grouping of related API endpoints (e.g., "Authentication", "Jobs").

```typescript
interface DocSection {
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
```

**Validation Rules**:
- `id` must be a valid HTML `id` attribute (lowercase, hyphenated, no spaces)
- `id` must be unique across all sections
- `title` must be non-empty
- `endpoints` array must contain at least one entry
- `icon` must be a valid lucide-react icon export name

**Relationships**: Contains 1..n `EndpointEntry` items.

---

### EndpointEntry

A single API endpoint's documentation.

```typescript
interface EndpointEntry {
  /** HTTP method (GET, POST, PUT, DELETE, PATCH) */
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
```

**Validation Rules**:
- `method` must be one of the `HttpMethod` enum values
- `path` must start with `/api/v1/`
- `auth` must be one of the `AuthType` enum values
- `parameters` may be empty (e.g., for simple GET endpoints)
- At least one of `requestExample` or `responseExample` should be non-null

**Relationships**: Belongs to one `DocSection`. Contains 0..n `ParamEntry` items and 0..2 `CodeExample` items.

---

### ParamEntry

A single parameter for an endpoint.

```typescript
interface ParamEntry {
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
```

**Validation Rules**:
- `name` must be non-empty
- `type` must be non-empty
- `required` is boolean (no "conditional" state)
- `defaultValue` should only be set when `required` is `false`

**Relationships**: Belongs to one `EndpointEntry`.

---

### CodeExample

A formatted, copyable block of text showing a cURL command or JSON body.

```typescript
interface CodeExample {
  /** Language for syntax highlighting */
  language: CodeLanguage;
  /** Display label (e.g., "cURL", "Response (200 OK)", "Request Body") */
  label: string;
  /** Raw code string (used for copy-to-clipboard and highlighting) */
  code: string;
}
```

**Validation Rules**:
- `language` must be one of the `CodeLanguage` enum values
- `code` must be non-empty
- `label` must be non-empty

**Relationships**: Belongs to one `EndpointEntry` (as `requestExample` or `responseExample`).

---

## Enumerations

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type AuthType = 'api-key' | 'jwt-bearer' | 'none';

type ParamLocation = 'query' | 'path' | 'body' | 'header';

type CodeLanguage = 'curl' | 'json';
```

---

## Section Registry

The top-level export that the `ApiDocs` page consumes:

```typescript
interface DocsConfig {
  /** Page-level metadata */
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogType: string;
  };
  /** Getting Started content (not endpoint-based, narrative text) */
  gettingStarted: GettingStartedSection;
  /** Ordered list of API sections */
  sections: DocSection[];
}
```

### GettingStartedSection

Special section with narrative content rather than endpoint entries.

```typescript
interface GettingStartedSection {
  id: 'getting-started';
  title: string;
  /** Ordered list of steps/paragraphs with optional code examples */
  steps: GettingStartedStep[];
}

interface GettingStartedStep {
  /** Step heading (e.g., "1. Create an Account", "2. Generate an API Key") */
  heading: string;
  /** Narrative description (plain text or HTML string) */
  content: string;
  /** Optional code example for this step */
  codeExample: CodeExample | null;
}
```

---

## Data File Organization

```
src/data/docs/
├── types.ts                  # All interfaces and enums above
├── index.ts                  # Exports DocsConfig assembled from all sections
├── meta.ts                   # Page metadata (title, description, OG tags)
├── getting-started.ts        # GettingStartedSection data
├── authentication.ts         # DocSection: Auth endpoints (10 endpoints)
├── jobs.ts                   # DocSection: Jobs endpoints (7 endpoints)
├── uploads.ts                # DocSection: Uploads endpoints (3 endpoints)
├── api-keys.ts               # DocSection: API Keys endpoints (3 endpoints)
├── usage.ts                  # DocSection: Usage Statistics endpoints (1 endpoint)
└── webhooks-settings.ts      # DocSection: Webhooks & Settings endpoints (3 endpoints)
```

**Note**: Dashboard and Playground endpoints are internal-facing (used by the app's own UI, not by external API consumers). They are excluded from the public API documentation per the spec's focus on developer-facing endpoints. The health check endpoint (`GET /health`) is also excluded as it's an infrastructure endpoint.

---

## State Transitions

This feature has no stateful entities. All data is static and read-only at runtime. The only runtime state is:
- `activeSection: string` — tracked by the `useActiveSection` hook (UI state, not persisted)
- `copyStatus: 'idle' | 'copied' | 'error'` — tracked by the `useCopyToClipboard` hook (UI state, auto-resets)
