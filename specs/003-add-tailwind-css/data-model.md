# Data Model: Add Tailwind CSS Styling Support

**Feature**: `003-add-tailwind-css`  
**Phase**: 1 — Design  
**Date**: 2026-04-05

This document defines the "data model" for the styling migration: design tokens, the target `@theme {}` block, and exhaustive component-by-component migration mappings from legacy styles to Tailwind utility classes.

---

## 1. Design Tokens — `@theme {}` Block

All custom tokens required for zero visual regression. These replace every non-standard color, shadow, and size value found in the existing `index.css` and inline style objects.

```css
@import "tailwindcss";
@source "../src/**";

@theme {
  /* === Typography === */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  /* === Brand / Primary === */
  --color-brand:      #007bff;
  --color-brand-dark: #0056b3;
  --color-muted:      #6c757d;

  /* === Danger / Error === */
  --color-danger:      #dc3545;
  --color-danger-dark: #c82333;
  --color-danger-bg:   #f8d7da;
  --color-danger-text: #721c24;

  /* === Success === */
  --color-success-bg:   #d4edda;
  --color-success-text: #155724;

  /* === Warning === */
  --color-warning:      #ffc107;
  --color-warning-text: #333333;

  /* === Neutral / Layout === */
  --color-page-bg:       #f4f7f6;
  --color-sidebar:       #1a1a1a;
  --color-sidebar-hover: #333333;
  --color-sidebar-user:  #2a2a2a;

  /* === Shadows === */
  --shadow-card:      0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-auth-card: 0 4px 20px rgba(0, 0, 0, 0.08);

  /* === Sizing === */
  --max-w-auth: 420px;
}
```

### Token Usage Index

| Token name | Used by |
|------------|---------|
| `--color-brand` | Auth buttons, auth links, focus rings, stat numbers, create key button |
| `--color-brand-dark` | Auth button hover, auth link hover |
| `--color-muted` | Auth button disabled state |
| `--color-danger` | Logout button, Revoke button, field errors |
| `--color-danger-dark` | Logout button hover |
| `--color-danger-bg` / `--color-danger-text` | Error banners (Dashboard, ApiKeyManager, auth pages) |
| `--color-success-bg` / `--color-success-text` | New key created banner, success states |
| `--color-warning` / `--color-warning-text` | Unverified email badge |
| `--color-page-bg` | `<body>` background |
| `--color-sidebar` | Sidebar `<nav>` background |
| `--color-sidebar-hover` | Sidebar nav link `:hover` background |
| `--color-sidebar-user` | User info box background in sidebar |
| `--shadow-card` | Dashboard stat cards, ApiKeyManager container |
| `--shadow-auth-card` | Auth card (Login, Register, etc.) |
| `--max-w-auth` | Auth card max-width |
| `--font-sans` | Body / root font family |

---

## 2. Preflight Audit — Rules Removed from `index.css`

Tailwind v4 preflight covers or supersedes these existing rules. All are REMOVED before `@import "tailwindcss"` is added.

| Rule | Reason for removal |
|------|--------------------|
| `body { margin: 0 }` | Preflight resets all margins to 0 |
| `body { font-family: ... }` | Replaced by `--font-sans` in `@theme` + `font-sans` class on root |
| `body { background-color: #f4f7f6 }` | Replaced by `bg-page-bg` on root div |
| `body { color: #333 }` | Replaced by `text-[#333]` (or Tailwind `text-gray-700` equivalent) on root — use `text-[#333333]` for exactness |
| `.form-group input { box-sizing: border-box }` | Preflight sets `box-sizing: border-box` globally |

---

## 3. Final `index.css` Shape

After migration, `index.css` contains ONLY:

```css
@import "tailwindcss";
@source "../src/**";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  --color-brand:        #007bff;
  --color-brand-dark:   #0056b3;
  --color-muted:        #6c757d;
  --color-danger:       #dc3545;
  --color-danger-dark:  #c82333;
  --color-danger-bg:    #f8d7da;
  --color-danger-text:  #721c24;
  --color-success-bg:   #d4edda;
  --color-success-text: #155724;
  --color-warning:      #ffc107;
  --color-warning-text: #333333;
  --color-page-bg:      #f4f7f6;
  --color-sidebar:      #1a1a1a;
  --color-sidebar-hover:#333333;
  --color-sidebar-user: #2a2a2a;

  --shadow-card:      0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-auth-card: 0 4px 20px rgba(0, 0, 0, 0.08);

  --max-w-auth: 420px;
}
```

No other rules. No `@keyframes` (none existed). No complex pseudo-selector rules (all existing `:hover` and `:focus` states are expressible as Tailwind variants).

---

## 4. Component Migration Mappings

### 4.1 App.tsx — App Shell Layout

**Hydration loading state** (inline → Tailwind):

| Before (inline style) | After (Tailwind classes) |
|-----------------------|--------------------------|
| `style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}` | `className="flex justify-center items-center h-screen"` |

**AppContent layout** (CSS class → Tailwind):

| CSS class | Tailwind equivalent |
|-----------|---------------------|
| `className="layout"` | `className="flex min-h-screen font-sans bg-page-bg text-[#333]"` |
| `className="sidebar"` | `className="w-[250px] bg-sidebar text-white p-5 flex flex-col"` |
| `sidebar h2` (CSS selector) | `className="mt-0 text-2xl"` on `<h2>` |
| `sidebar ul` (CSS selector) | `className="list-none p-0 flex-1"` on `<ul>` |
| `sidebar ul li` (CSS selector) | `className="mb-2.5"` on each `<li>` |
| `sidebar ul li a` (CSS selector) | `className="text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover"` on each `<Link>` |
| `className="user-info"` | `className="mb-5 p-3 bg-sidebar-user rounded"` |
| `className="user-email"` | `className="block text-sm text-[#ddd] break-all"` |
| `className="badge badge-warning"` | `className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 bg-warning text-warning-text"` |
| `className="logout-btn"` | `className="mt-auto px-4 py-2 bg-danger text-white border-none rounded cursor-pointer w-full text-sm hover:bg-danger-dark transition-colors"` |
| `className="content"` | `className="flex-1 p-10"` |

---

### 4.2 Dashboard.tsx — Stat Cards

**Stat cards wrapper** (inline → Tailwind):

| Before | After |
|--------|-------|
| `style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}` | `className="flex gap-5 mb-10 flex-wrap"` |

**`cardStyle` const object** (inline → Tailwind):

| Before | After |
|--------|-------|
| `style={cardStyle}` (background: white, padding: 20px, borderRadius: 8px, boxShadow: shadow-card, flex: 1 1 150px, textAlign: center, minWidth: 150px) | `className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]"` |

**`statStyle` const object** (inline → Tailwind):

| Before | After |
|--------|-------|
| `style={statStyle}` (fontSize: 24px, fontWeight: bold, color: #007bff) | `className="text-2xl font-bold text-brand"` |

**Error banner** (inline → Tailwind):

| Before | After |
|--------|-------|
| `style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}` | `className="bg-danger-bg text-danger-text p-2.5 rounded mb-5"` |

---

### 4.3 ApiKeyManager.tsx — Fully Inline-Styled

**Container**:

| Before | After |
|--------|-------|
| `style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}` | `className="bg-white p-5 rounded-lg shadow-card"` |

**Error banner**:

| Before | After |
|--------|-------|
| `style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}` | `className="bg-danger-bg text-danger-text p-2.5 rounded mb-5"` |

**Success banner (created key)**:

| Before | After |
|--------|-------|
| `style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}` | `className="bg-success-bg text-success-text p-2.5 rounded mb-5"` |

**Created key `<code>`**:

| Before | After |
|--------|-------|
| `style={{ wordBreak: 'break-all' }}` | `className="break-all"` |

**Create key form**:

| Before | After |
|--------|-------|
| `style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}` | `className="flex gap-2.5 mb-5"` |

**Name input**:

| Before | After |
|--------|-------|
| `style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flex: 1 }}` | `className="p-2 border border-[#ddd] rounded flex-1"` |

**Create key button**:

| Before | After |
|--------|-------|
| `style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isMutating ? 'not-allowed' : 'pointer' }}` | `className={\`px-4 py-2 bg-brand text-white border-none rounded \${isMutating ? 'cursor-not-allowed' : 'cursor-pointer'}\`}` |

**Table**:

| Before | After |
|--------|-------|
| `style={{ width: '100%', borderCollapse: 'collapse' }}` | `className="w-full border-collapse"` |

**Table header row**:

| Before | After |
|--------|-------|
| `style={{ background: '#f8f9fa', textAlign: 'left' }}` | `className="bg-[#f8f9fa] text-left"` |

**Table header cells `<th>`**:

| Before | After |
|--------|-------|
| `style={{ padding: '12px', borderBottom: '1px solid #ddd' }}` | `className="p-3 border-b border-[#ddd]"` |

**Table data cells `<td>`**:

| Before | After |
|--------|-------|
| `style={{ padding: '12px', borderBottom: '1px solid #ddd' }}` | `className="p-3 border-b border-[#ddd]"` |

**Empty state cell**:

| Before | After |
|--------|-------|
| `style={{ padding: '12px', textAlign: 'center', color: '#666' }}` | `className="p-3 text-center text-[#666]"` |

**Revoke button**:

| Before | After |
|--------|-------|
| `style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: isMutating ? 'not-allowed' : 'pointer' }}` | `className={\`px-3 py-1.5 bg-danger text-white border-none rounded \${isMutating ? 'cursor-not-allowed' : 'cursor-pointer'}\`}` |

---

### 4.4 ProtectedRoute.tsx — Loading State

| Before | After |
|--------|-------|
| `style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}` | `className="flex justify-center items-center h-screen"` |

---

### 4.5 Auth Pages (Login, Register, ForgotPassword, ResetPassword, VerifyEmail)

All auth pages share the same structural pattern. Mappings below apply across all five components.

**Page wrapper**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-page"` | `className="flex justify-center items-center min-h-[80vh]"` |

**Card**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-card"` | `className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth"` |

**Card heading `<h1>`**:

| CSS selector rule | Tailwind on `<h1>` |
|-------------------|--------------------|
| `.auth-card h1 { margin: 0 0 8px; font-size: 28px; color: #1a1a1a }` | `className="m-0 mb-2 text-[28px] text-sidebar"` |

**Subtitle**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-subtitle"` | `className="text-[#666] mb-6 text-[15px]"` |

**Error banner**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-error"` | `className="bg-danger-bg text-danger-text px-4 py-3 rounded-md mb-5 text-sm"` |

**Form group wrapper**:

| CSS class | Tailwind |
|-----------|----------|
| `className="form-group"` | `className="mb-5"` |

**Form group label**:

| CSS selector rule | Tailwind on `<label>` |
|-------------------|-----------------------|
| `.form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #444 }` | `className="block mb-1.5 font-medium text-sm text-[#444]"` |

**Form group input**:

| CSS selector rule | Tailwind on `<input>` |
|-------------------|-----------------------|
| `width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; transition: border-color 0.2s; box-sizing: border-box` | `className="w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"` |

**Form actions right**:

| CSS class | Tailwind |
|-----------|----------|
| `className="form-actions-right"` | `className="text-right mb-5"` |

**Auth button**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-btn"` | `className="w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed"` |

**Auth link**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-link"` | `className="text-brand no-underline font-medium hover:underline"` |

**Auth footer**:

| CSS class | Tailwind |
|-----------|----------|
| `className="auth-footer"` | `className="text-center mt-6 text-[#666] text-sm"` |

**Password requirements wrapper**:

| CSS class | Tailwind |
|-----------|----------|
| `className="password-requirements"` | `className="mt-2 text-xs"` |

**Requirement item**:

| CSS class | Tailwind |
|-----------|----------|
| `className="req-item"` | `className="py-0.5"` |

**Requirement met**:

| CSS class | Tailwind |
|-----------|----------|
| `className="req-met"` | `className="py-0.5 text-[#28a745]"` |

**Requirement unmet**:

| CSS class | Tailwind |
|-----------|----------|
| `className="req-unmet"` | `className="py-0.5 text-[#999]"` |

**Field error**:

| CSS class | Tailwind |
|-----------|----------|
| `className="field-error"` | `className="text-danger text-xs mt-1"` |

**`<Link>` styled as auth button** (inline style in ForgotPassword, ResetPassword, VerifyEmail):

| Before | After |
|--------|-------|
| `className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}` | `className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors"` |

---

## 5. Entities Summary

| Entity | Type | Migration Target |
|--------|------|-----------------|
| `index.css` | Global stylesheet | Replace with `@import` + `@source` + `@theme {}` |
| `App.tsx` | App shell + layout | Inline hydration style + 10 CSS classes → Tailwind |
| `Dashboard.tsx` | Page component | 2 `React.CSSProperties` consts + 1 inline error banner → Tailwind |
| `ApiKeyManager.tsx` | Feature component | ~15 inline style props → Tailwind |
| `ProtectedRoute.tsx` | HOC | 1 inline loading style → Tailwind |
| `Login.tsx` | Auth page | ~8 CSS class usages → Tailwind |
| `Register.tsx` | Auth page | ~12 CSS class usages (includes password requirements) → Tailwind |
| `ForgotPassword.tsx` | Auth page | ~8 CSS classes + 1 inline Link style → Tailwind |
| `ResetPassword.tsx` | Auth page | ~10 CSS classes + 2 inline Link styles → Tailwind |
| `VerifyEmail.tsx` | Auth page | ~10 CSS classes + 2 inline Link styles → Tailwind |

---

## 6. Validation Rules (from spec)

- After migration: zero `style={{` attributes remain in `Dashboard.tsx` and `ApiKeyManager.tsx` (SC-003)
- After migration: `index.css` contains only `@import`, `@source`, and `@theme {}` — no other rules (SC-004)
- Build must complete with no errors (SC-005)
- All pages must render visually equivalent to pre-migration (SC-001)
- Developer must be able to add new Tailwind classes without touching `index.css` (SC-002)
