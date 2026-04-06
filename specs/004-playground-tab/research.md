# Research: Playground Tab

**Feature Branch**: `004-playground-tab`
**Date**: 2026-04-06

## 1. Backend Endpoint Design — Session-Auth Proxied Job Submission

### Decision
Create a thin `POST /api/v1/playground/test-job` endpoint authenticated via JWT bearer (session auth, reusing existing `get_current_user` dependency). The endpoint auto-selects the user's first active API key as the `api_key_id` for the created job, then delegates to the existing job-creation + Celery dispatch logic.

### Rationale
- The spec explicitly separates the playground submission path (`session auth → backend picks API key`) from the canonical public API path (`X-API-Key` header).
- Reusing `get_current_user` (which already supports JWT bearer tokens via the `HTTPBearer` scheme) means zero new auth logic.
- The endpoint shares the same `JobCreate` Pydantic schema for validation, ensuring parity with the real API.
- The existing `check_concurrent_jobs_limit` dependency operates on `ApiKey`, so the playground endpoint must manually enforce the same limit using the auto-selected key.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Reuse `POST /api/v1/jobs` with session auth | Would silently change the authentication contract of the public API; confusing for documentation and SDK users |
| Create a separate playground-specific Celery queue | Over-engineering; test jobs are real jobs and should follow the standard pipeline |
| Client-side-only playground (no submission) | Spec explicitly requires live test submission (FR-010, Story 4) |

---

## 2. API Key Auto-Selection Strategy

### Decision
Query the user's **first active API key** ordered by `created_at ASC`. If no active key exists, return `HTTP 400` with a clear message prompting key creation.

### Rationale
- Simplest deterministic strategy — users typically have 1–3 keys.
- Matches the spec's "auto-selects the user's first active API key" language.
- Ordering by `created_at ASC` gives consistent, predictable behavior.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Let user choose key in UI | Adds unnecessary complexity for a playground; deferred to a future version |
| Use most-recently-used key | Requires tracking `last_used_at` updates, adds a write on every key lookup |

---

## 3. Live JSON Preview — Client-Side Derivation

### Decision
Derive the JSON preview as a pure function of the form state on every React render cycle. Use `useMemo` keyed on the form state to avoid unnecessary recomputation. Omit fields at their default values (FR-014).

### Rationale
- Zero network calls → sub-100 ms updates guaranteed.
- The `JobCreate` schema is well-defined and stable; the frontend can mirror it precisely with TypeScript types.
- Default-omission logic is straightforward: compare each field to its known default (`output_format: "mp4"`, `preset: null`, `generate_subtitles: false`, etc.).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Server-side preview endpoint | Unnecessary latency for a purely deterministic transformation |
| Debounced preview updates | Adds perceived lag; instant updates are feasible since the computation is trivial |

---

## 4. JSON Syntax Highlighting — Approach

### Decision
Implement lightweight custom syntax highlighting using a small utility function that tokenizes JSON strings and wraps keys, strings, numbers, booleans, and nulls in `<span>` elements with Tailwind color classes. Render via `dangerouslySetInnerHTML` on a `<pre><code>` block.

### Rationale
- The JSON preview is a single, well-structured object (not arbitrary code). A full syntax highlighting library (Prism, Shiki, Highlight.js) would add 30–150 KB of bundle weight for minimal benefit.
- Custom tokenization for JSON is ~30 lines of code and provides full control over theming via Tailwind tokens.
- Keeps the dependency footprint minimal (constitution principle: modularity).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Prism.js / Highlight.js | Heavy bundle size for a single JSON block; overkill |
| `react-syntax-highlighter` | Wraps Prism/Highlight with React; same bundle concern |
| No highlighting (plain text) | Spec explicitly requires syntax-highlighted JSON (FR-016) |

---

## 5. cURL Command Generation

### Decision
Create a `curlBuilder.ts` utility that takes the API base URL (from `VITE_API_URL`), the JSON body object, and produces a multi-line cURL command string with `-X POST`, `-H "Content-Type: application/json"`, `-H "X-API-Key: $API_KEY"`, and `-d '{...}'`.

### Rationale
- The cURL output must use `$API_KEY` placeholder (FR-007) to educate developers.
- The base URL must be dynamic from `VITE_API_URL` (FR-007 clarification).
- A pure function is easily unit-testable.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Use `curlconverter` npm package | Adds dependency for a trivial transformation; the output format is fixed |

---

## 6. Split-Pane Layout Strategy

### Decision
Use CSS Flexbox with fixed percentage widths (`55% / 45%`) and `overflow-y: auto` on each panel. No draggable splitter for the initial release.

### Rationale
- Spec specifies approximate widths (`~55% / ~45%`), not a resizable splitter.
- Flexbox is natively supported, requires no dependencies, and integrates cleanly with Tailwind utility classes.
- Independent scrolling is achieved with `overflow-y-auto` and a fixed height (e.g., `h-[calc(100vh-<header>)]`).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| CSS Grid | Flexbox is simpler for a two-column layout with no complex track relationships |
| `react-split-pane` library | Adds a dependency for drag-to-resize that the spec doesn't require |
| Stacked layout (mobile-first) | Spec explicitly requires side-by-side (FR-015); mobile layout is deferred |

---

## 7. Clipboard API Usage

### Decision
Use `navigator.clipboard.writeText()` wrapped in a try-catch. On success, temporarily show "Copied!" text on the button for 2 seconds (via local `useState`). On failure, fall back to `document.execCommand('copy')` with a textarea workaround.

### Rationale
- `navigator.clipboard.writeText()` is supported in all modern browsers and is the recommended async clipboard API.
- The fallback ensures copy works in older browsers or non-HTTPS localhost dev environments.
- Brief visual confirmation satisfies FR-009.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Clipboard.js library | Unnecessary dependency; native API is sufficient |
| Toast notification library | Over-engineering; a simple button text change is sufficient per spec |

---

## 8. Form State Management

### Decision
Create a custom `usePlaygroundForm` hook using `useReducer` for complex nested state (HLS config, renditions list). Derive the JSON preview payload via `useMemo` from the reducer state.

### Rationale
- `useReducer` handles the nested HLS config + dynamic renditions array more cleanly than multiple `useState` calls.
- Keeps all form logic in a single, testable hook, separate from presentation.
- No need for Zustand (global state) since playground state is page-local and transient (resets on navigation).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Multiple `useState` calls | Unwieldy for nested HLS config with dynamic renditions |
| Zustand store | Playground state is local and ephemeral; global state is unnecessary |
| React Hook Form | Adds dependency; the form doesn't have complex validation needs that justify it |

---

## 9. Request/Response Tab Toggle (Post-Submission)

### Decision
Use a local `useState<'request' | 'response'>` to toggle the right panel content. After a successful submission, auto-switch to `'response'`; the user can manually toggle back to `'request'`. The response object is stored in local state.

### Rationale
- Simple, lightweight approach matching the spec (FR-017: "Request/Response tab toggle").
- No need for a tab library; two styled buttons and conditional rendering suffice.
- Both views remain in memory (no re-fetch needed when toggling).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Replace preview permanently | Spec says user must be able to toggle back (FR-017) |
| Use a tab component library | Overkill for two tabs; simple conditional rendering is cleaner |
