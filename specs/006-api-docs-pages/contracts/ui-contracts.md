# UI Contracts: API Documentation Pages

**Feature**: 006-api-docs-pages  
**Date**: 2026-04-10

## Overview

This feature exposes a frontend UI to end users (developers). The contracts below define the component interfaces, route behavior, and user-facing interaction patterns that constitute the feature's public surface.

---

## Route Contract

### `GET /docs`

**Visibility**: Public (no authentication required)  
**Type**: SPA client-side route (react-router-dom)

**Behavior**:
- Renders the `ApiDocs` page component
- Supports URL hash fragments (`/docs#jobs`, `/docs#authentication`) for direct-linking to sections
- On load with hash: auto-scrolls to the matching section
- On load without hash: shows page from top, "Getting Started" section is active

**SEO**:
- Browser tab title: "API Documentation — TranscodeFlow"
- Meta description present in raw HTML `index.html`
- Open Graph tags (`og:title`, `og:description`, `og:type`) in raw HTML

---

## Component Interface Contracts

### `<ApiDocs />`

**Location**: `frontend/src/pages/ApiDocs.tsx`  
**Props**: None (page-level component)

**Renders**:
- Document title override via `useDocumentHead`
- Docs sidebar navigation (left, sticky)
- Main content area with all sections
- Responsive layout: sidebar collapses to top nav on narrow viewports (<768px)

---

### `<DocsSidebar />`

**Location**: `frontend/src/components/docs/DocsSidebar.tsx`

```typescript
interface DocsSidebarProps {
  sections: Array<{ id: string; title: string; icon: string }>;
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}
```

**Behavior**:
- Renders a vertical list of section links
- Highlights the `activeSection` with accent styling
- Calls `onSectionClick` when a link is clicked
- Sticky positioning (`sticky top-0`)

---

### `<EndpointCard />`

**Location**: `frontend/src/components/docs/EndpointCard.tsx`

```typescript
interface EndpointCardProps {
  endpoint: EndpointEntry;
}
```

**Renders**:
- HTTP method badge (colored: GET=green, POST=blue, PUT=amber, DELETE=red)
- URL path in monospace
- Auth type indicator (API Key badge or JWT Bearer badge)
- Rate limit badge (if applicable)
- Description text
- Parameter table (if parameters exist)
- Request example code block (if exists)
- Response example code block (if exists)

---

### `<CodeBlock />`

**Location**: `frontend/src/components/docs/CodeBlock.tsx`

```typescript
interface CodeBlockProps {
  code: string;
  language: 'curl' | 'json';
  label?: string;
}
```

**Behavior**:
- Renders syntax-highlighted code in a `<pre>` block
- Shows a copy-to-clipboard button (top-right, visible on hover/focus)
- Displays optional label above the code block
- JSON highlighting uses existing `text-json-*` token classes
- cURL highlighting uses new `text-curl-*` token classes

---

### `<ParamTable />`

**Location**: `frontend/src/components/docs/ParamTable.tsx`

```typescript
interface ParamTableProps {
  parameters: ParamEntry[];
}
```

**Renders**:
- Responsive table with columns: Name, Type, Required, Default, Description
- Required params show a red "Required" badge
- Optional params show a gray "Optional" badge
- Default values displayed in monospace

---

### `<SectionHeading />`

**Location**: `frontend/src/components/docs/SectionHeading.tsx`

```typescript
interface SectionHeadingProps {
  id: string;
  title: string;
  description: string;
  icon: string;
}
```

**Behavior**:
- Renders an `<h2>` with `id` attribute for anchor linking
- Displays the lucide icon alongside the title
- Shows the section description below the heading
- Provides a hover-visible anchor link icon for copy-pasting section URLs

---

## Hook Contracts

### `useActiveSection`

**Location**: `frontend/src/hooks/useActiveSection.ts`

```typescript
function useActiveSection(options: {
  sectionIds: string[];
  rootMargin?: string;
}): {
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
}
```

**Behavior**:
- Tracks which documentation section is currently in the viewport
- Updates `activeSection` based on IntersectionObserver
- `scrollToSection` smooth-scrolls to target and locks active state during scroll
- Syncs URL hash via `history.replaceState`
- Initializes from `location.hash` on mount

---

### `useCopyToClipboard`

**Location**: `frontend/src/hooks/useCopyToClipboard.ts`

```typescript
function useCopyToClipboard(resetDelay?: number): {
  status: 'idle' | 'copied' | 'error';
  copy: (text: string) => Promise<void>;
}
```

**Behavior**:
- Copies text to clipboard using `navigator.clipboard.writeText`
- Returns current status for UI feedback
- Auto-resets to `idle` after `resetDelay` ms (default: 2000)
- Falls back to `execCommand('copy')` if Clipboard API unavailable

---

### `useDocumentHead`

**Location**: `frontend/src/hooks/useDocumentHead.ts`

```typescript
function useDocumentHead(title: string): void
```

**Behavior**:
- Sets `document.title` on mount and when `title` changes
- Restores previous title on unmount
- Lightweight — meta tags handled statically in `index.html`

---

## Interaction Patterns

### Section Navigation Flow

```
User clicks section link in DocsSidebar
  → onSectionClick fires
  → scrollToSection locks activeSection to target
  → Page smooth-scrolls to target section
  → URL hash updates to #section-id
  → scrollend / timeout unlocks observer
  → IntersectionObserver resumes tracking
```

### Code Copy Flow

```
User hovers code block
  → Copy button becomes visible (opacity transition)
User clicks Copy button
  → copy(codeText) called
  → Clipboard API writes text
  → status → 'copied', button shows "Copied!"
  → After 2s, status → 'idle', button reverts to "Copy"
```

### Direct URL Access Flow

```
User navigates to /docs#jobs
  → React Router renders ApiDocs
  → useActiveSection reads location.hash
  → activeSection initialized to "jobs"
  → Browser auto-scrolls to #jobs element
  → DocsSidebar highlights "Jobs" section
```
