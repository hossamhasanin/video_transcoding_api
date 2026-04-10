# Quickstart: API Documentation Pages

**Feature**: 006-api-docs-pages  
**Date**: 2026-04-10

## Prerequisites

- Node.js (version compatible with React 19)
- Frontend dev server running: `cd frontend && npm run dev`

## Quick Verification

After implementation, verify the feature works:

### 1. Navigate to Documentation (Public Access)

```bash
# Open browser (logged out) and navigate to:
http://localhost:5173/docs
```

**Expected**: Documentation page renders with all sections visible, no login redirect.

### 2. Verify Sidebar Navigation

```bash
# While on /docs, check the sidebar
```

**Expected**: "Documentation" link appears in sidebar with icon, visually highlighted as active. If logged out, it appears alongside "Sign In" and "Create Account".

### 3. Test Section Navigation

```bash
# Click any section link in the docs sidebar/nav (e.g., "Jobs")
```

**Expected**: Page smooth-scrolls to the Jobs section. URL updates to `http://localhost:5173/docs#jobs`. The clicked section is highlighted in the navigation.

### 4. Test Code Copy

```bash
# Find any code example block and click the copy button
```

**Expected**: Button text changes to "Copied!" for 2 seconds, clipboard contains the code content.

### 5. Verify Endpoint Details

```bash
# Navigate to the Jobs section and find "Submit a new transcoding job"
```

**Expected**: Shows POST method badge, `/api/v1/jobs/` path, description, API Key auth indicator, parameter table with all fields, cURL request example, and JSON response example.

### 6. Verify SEO Tags

```bash
# View page source (Ctrl+U / Cmd+U)
```

**Expected**: `<title>`, `<meta name="description">`, and `<meta property="og:*">` tags present in the raw HTML.

### 7. Run Tests

```bash
cd frontend && npm test
```

**Expected**: All new tests pass (route rendering, copy functionality, navigation, section anchor IDs).

### 8. Build Verification

```bash
cd frontend && npm run build
```

**Expected**: Production build succeeds with no TypeScript errors. No new warnings.

## Key Files to Edit

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add `/docs` route + "Documentation" sidebar NavLink |
| `frontend/index.html` | Add SEO meta tags |
| `frontend/src/index.css` | Add cURL syntax color tokens to `@theme {}` |
| `frontend/src/pages/ApiDocs.tsx` | New — main documentation page |
| `frontend/src/components/docs/*.tsx` | New — DocsSidebar, EndpointCard, CodeBlock, ParamTable, SectionHeading |
| `frontend/src/data/docs/*.ts` | New — all data files (types, sections, index) |
| `frontend/src/hooks/useActiveSection.ts` | New — scroll-spy hook |
| `frontend/src/hooks/useCopyToClipboard.ts` | New — clipboard hook |
