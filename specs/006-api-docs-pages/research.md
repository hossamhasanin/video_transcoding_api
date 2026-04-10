# Research: API Documentation Pages

**Feature**: 006-api-docs-pages  
**Date**: 2026-04-10

## R1: Syntax Highlighting for Code Blocks

**Decision**: Hand-crafted regex + span wrapping, extending the existing `highlightJson()` pattern (zero new dependencies)

**Rationale**:
- The project already has a working `highlightJson()` function in `frontend/src/utils/jsonUtils.ts:10` that uses regex tokenization with `dangerouslySetInnerHTML` and maps to `text-json-*` Tailwind utilities backed by `@theme` tokens in `index.css:58-64`.
- The cURL builder utilities (`curlBuilder.ts`, `apiFlowCurlBuilder.ts`) produce predictable, template-generated output — the input format is controlled and constrained, eliminating the primary risk of regex-based highlighting.
- Only 2 languages needed (JSON + cURL). A full tokenizer library is overkill for 2 known formats.
- Adding ~30 lines for `highlightCurl()` and 5 new `@theme` color tokens (`--color-curl-command`, `--color-curl-flag`, `--color-curl-url`, `--color-curl-header-value`, `--color-curl-string`) is trivially maintainable.

**Alternatives Considered**:
- `prism-react-renderer`: 15-20 KB gzipped, requires custom theme adapter to bridge Tailwind tokens, React 19 compatibility untested. Rejected — marginal accuracy gain on controlled input doesn't justify dependency + size.
- `shiki`: 300-800 KB gzipped (WASM), async loading, separate theme format. Rejected — massive overhead for 2 fixed formats.
- Plain `<pre><code>` with no tokenization: Rejected — downgrades from existing Playground behavior; JSON keys/values would be indistinguishable.

---

## R2: Copy-to-Clipboard Implementation

**Decision**: Custom `useCopyToClipboard` hook using native `navigator.clipboard.writeText()` with `execCommand` fallback, paired with a reusable `CopyButton` component.

**Rationale**:
- `navigator.clipboard.writeText()` is supported in all target browsers (Chrome, Firefox, Safari, Edge) in secure contexts.
- A custom hook (~25 lines) separates async logic + feedback timer from UI rendering.
- `useRef` for the reset timer avoids stale-closure issues and unnecessary re-renders.
- 2-second "Copied!" feedback state with automatic reset to "idle".
- Graceful fallback via `document.execCommand('copy')` for non-HTTPS dev environments.

**Accessibility**:
- `aria-live="polite"` on the button announces state changes to screen readers.
- `aria-label` updates contextually ("Copy code to clipboard" → "Code copied to clipboard").
- Native `<button>` element provides keyboard accessibility by default.
- `focus-visible:opacity-100` ensures keyboard users see the copy button.

**Alternatives Considered**:
- `react-copy-to-clipboard` / `clipboard.js`: Rejected — adds a dependency for ~10 lines of native API code.
- CSS `@keyframes` animation for feedback: Rejected — Tailwind `transition-all duration-200` handles the color shift cleanly.

---

## R3: SEO Meta Tags Strategy

**Decision**: Hybrid approach — static meta tags in `index.html` (for social crawlers) + lightweight `useDocumentHead` hook (for runtime title updates).

**Rationale**:
- **Google Search**: Renders pages with headless Chromium and indexes JS-set meta tags. Client-side `useEffect` works for Google SEO.
- **Social sharing crawlers** (Facebook, Twitter/X, LinkedIn, Slack, Discord): Do NOT execute JavaScript. Only raw HTML tags are visible. Since `/docs` is the only page needing public SEO/sharing, putting OG tags directly in `index.html` ensures social previews work.
- Only `/docs` needs custom SEO tags — no need for a per-route head management system.
- A ~20-line `useDocumentHead` hook can override `document.title` at runtime for browser tab display (e.g., "API Docs — TranscodeFlow").

**Implementation**:
1. Add `<title>`, `<meta name="description">`, and `<meta property="og:*">` tags directly to `frontend/index.html` with `/docs`-oriented content.
2. Create a `useDocumentHead(title, description?)` hook that sets `document.title` in `useEffect` and cleans up on unmount.
3. Non-docs pages can use the hook to override the tab title (e.g., Dashboard page sets "Dashboard — TranscodeFlow").

**Tradeoff**: Since it's a SPA with one `index.html`, the OG tags will show `/docs` metadata even if someone shares a different route. This is acceptable because authenticated pages aren't typically shared on social media, and `/docs` is the only public-facing page.

**Alternatives Considered**:
- `react-helmet-async`: ~8 KB gzipped, has open React 19 compatibility issues (#266), provides same SEO outcome as `useEffect` without SSR. Rejected.
- Vite MPA mode: Produces separate HTML per route but breaks SPA routing architecture. Rejected — architectural change not justified for one page.

---

## R4: Scroll-Spy / Active Section Tracking

**Decision**: Custom `useActiveSection` hook using a single `IntersectionObserver` with `rootMargin`-based detection zone.

**Rationale**:
- Single `IntersectionObserver` with `rootMargin: "0px 0px -60% 0px"` creates a "reading zone" in the top 40% of the viewport, naturally selecting the section the user is currently reading.
- DOM-ordered tiebreaking: among visible sections, the first in `sectionIds` array order wins.
- Nav-click locking: a `scrollTargetRef` flag prevents sidebar flickering during smooth-scroll by ignoring observer updates until `scrollend` event (with 800ms timeout fallback).
- URL hash sync via `history.replaceState` (not `pushState`) — no history pollution from scrolling.
- Initial load reads `location.hash` to scroll to the correct section.

**Smooth Scrolling**:
- CSS `scroll-behavior: smooth` on `html` element — works with anchor clicks automatically.
- `@media (prefers-reduced-motion: reduce)` override to `scroll-behavior: auto` — already exists in the project's `index.css` reduced-motion media query.
- `scrollIntoView({ behavior: 'smooth' })` for programmatic navigation from nav clicks.

**Edge Cases Handled**:
- Multiple sections visible → earliest in DOM order wins.
- Fast scrolling → observer batches callbacks; active indicator lands correctly once scrolling stops.
- Nav click during scroll → `scrollTargetRef` lock prevents flickering.

**Performance**:
- One observer, multiple targets (not one observer per section).
- No debouncing needed — browser rate-limits observer callbacks.
- No `getBoundingClientRect()` calls in scroll handlers (observer provides this for free).
- Cleanup: observer disconnected on unmount via `useEffect` return.

**Alternatives Considered**:
- Scroll event listener with `getBoundingClientRect()`: Rejected — forces layout recalculation on every scroll frame, poor performance.
- `react-scrollspy` or `react-intersection-observer`: Rejected — adds dependency for ~40 lines of native API code.
- `useNavigate()` / `<Link>` for hash navigation: Rejected — creates unnecessary history entries and React Router re-renders.

---

## R5: Existing Codebase Patterns (for consistency)

**Findings** (captured for implementation reference):

| Pattern | Convention | Source |
|---------|-----------|--------|
| Component return type | `React.ReactElement` explicit annotation | All page components |
| Styling | Tailwind CSS v4 utility classes only | Project constitution + all components |
| Icons | `lucide-react` imports (e.g., `LayoutDashboard`, `Key`) | `App.tsx:3` |
| Sidebar NavLink | `NavLink` with `isActive` class toggling, `bg-sidebar-active` / `text-white/80 hover:bg-sidebar-hover` | `App.tsx:55-86` |
| Card pattern | `bg-surface-raised rounded-xl border border-border shadow-card` | Dashboard, Settings |
| Section heading | `text-2xl font-bold text-text-primary mb-6` | All pages |
| Public route | Bare `<Route path="/x" element={<Component />} />` (no `ProtectedRoute`) | `App.tsx:118-120` |
| State management | Zustand with persist middleware | `authStore.ts` |
| Data fetching | SWR hooks | `useUsageStats`, `useJobs`, etc. |
| Testing | Vitest + @testing-library/react + jsdom | `vite.config.ts`, `test/` directory |
| JSON highlighting | `highlightJson()` with `dangerouslySetInnerHTML` + `text-json-*` classes | `jsonUtils.ts:10` |

**Backend API Coverage** (all endpoints to document):
- Auth: 10 endpoints (register, login, refresh, me, profile, change-password, forgot-password, reset-password, verify-email, resend-verification)
- Jobs: 7 endpoints (submit, list, get status, cancel, SSE events, HLS stream, webhook deliveries)
- Uploads: 3 endpoints (presign, status, cancel)
- API Keys: 3 endpoints (list, create, revoke)
- Usage: 1 endpoint (get statistics)
- Dashboard: 1 endpoint (list jobs)
- Playground: 5 endpoints (HLS templates, test job submit/status, stream, upload)
- Settings: 3 endpoints (get/update webhook, regenerate secret)
- Health: 1 endpoint (health check)
