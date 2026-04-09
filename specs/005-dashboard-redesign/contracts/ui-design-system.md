# UI Contract: Dashboard Visual Redesign — Design Token System

**Feature Branch**: `005-dashboard-redesign`
**Date**: 2026-04-09

> This contract defines the visual design system that all frontend components MUST adhere to
> after the redesign. It serves as the interface between the design token layer (`index.css`)
> and all consuming components.

---

## 1. Token Naming Convention

All design tokens follow a semantic naming scheme:

```
--color-{category}-{variant}
--shadow-{usage}
--font-{type}
```

**Categories**: `accent`, `surface`, `sidebar`, `text`, `border`, `danger`, `success`, `warning`
**Variants**: `hover`, `soft`, `glow`, `from`, `to`, `active`, `primary`, `secondary`, `tertiary`

### Rule: No Hardcoded Colors
Components MUST reference design tokens via Tailwind utility classes (e.g., `bg-accent`, `text-text-primary`, `border-border`). No raw hex values (`#6366f1`), rgb values, or inline styles for colors are permitted in component code.

**Allowed:**
```jsx
<div className="bg-accent text-white">
<div className="text-text-secondary">
<div className="border-border">
```

**Not allowed:**
```jsx
<div className="bg-[#6366f1]">
<div style={{ color: '#64748b' }}>
```

---

## 2. Component Visual Contracts

### 2.1 Sidebar Navigation

| Property | Value |
|---|---|
| Background | Gradient: `from-sidebar-from to-sidebar-to` (vertical) |
| Width | `250px` (unchanged) |
| Brand header | Logo mark (Lucide `Play` or `Zap` icon) + "TranscodeFlow" text |
| Nav link (default) | `text-white/80`, `rounded-lg`, `px-3 py-2.5` |
| Nav link (hover) | `bg-sidebar-hover`, `text-white` |
| Nav link (active) | `bg-sidebar-active`, `border-l-2 border-accent`, accent glow |
| User profile | Circular avatar (initials), email, verification badge |
| Sign Out button | `bg-white/10 hover:bg-white/15`, rounded |

### 2.2 Stats Cards

| Property | Value |
|---|---|
| Layout | CSS Grid: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` |
| Card background | `bg-surface-overlay backdrop-blur-sm` |
| Card border | `border border-white/20` |
| Card radius | `rounded-xl` |
| Card padding | `p-5` |
| Hover effect | `-translate-y-1`, `shadow-card-hover`, 200ms transition |
| Icon | 40×40 rounded background with stat-specific color, Lucide icon |
| Number | `text-3xl font-bold`, animated via `useCountUp` |
| Label | `text-sm text-text-secondary` |

### 2.3 Job History Table

| Property | Value |
|---|---|
| Container | `bg-surface-raised rounded-xl border border-border overflow-hidden` |
| Table header | `backdrop-blur-sm bg-white/80 sticky top-0`, `text-xs font-semibold text-text-secondary uppercase tracking-wider` |
| Row hover | `hover:bg-accent-soft` transition 150ms |
| Status badges (active) | `animate-pulse-soft` (processing, transcoding, uploading) |
| Status badges (terminal) | Static, no animation |
| Expanded panel | `animate-slide-down`, left-border accent |
| Filter bar | Pill-shaped selects: `rounded-full border-border` |
| Pagination | Active page button: `bg-accent text-white` |

### 2.4 API Key Manager

| Property | Value |
|---|---|
| Container | `bg-surface-raised rounded-xl border border-border p-6` |
| Key items | Card layout with vertical stacking, `border-b border-border-subtle` |
| Key prefix | `font-mono text-sm bg-accent-soft text-accent rounded px-2 py-0.5` |
| Create input | `focus:ring-2 focus:ring-accent focus:border-accent` |
| Create button | `bg-accent hover:bg-accent-hover text-white rounded-lg` |
| Revoke button | `bg-danger/10 text-danger hover:bg-danger/20 rounded-lg` |
| Success alert | `bg-accent-soft border border-accent/20 text-accent rounded-lg` with icon |

### 2.5 Auth Pages

| Property | Value |
|---|---|
| Page background | `bg-surface` with subtle gradient/noise overlay |
| Card | `bg-surface-raised rounded-2xl shadow-auth-card p-10` |
| Heading | `text-text-primary text-2xl font-bold` |
| Inputs | `border-border focus:border-accent focus:ring-2 focus:ring-accent-glow rounded-lg` |
| Submit button | `bg-accent hover:bg-accent-hover text-white rounded-lg` |
| Links | `text-accent hover:text-accent-hover` |

---

## 3. Animation Contracts

| Animation | Default (no-preference) | Reduced Motion |
|---|---|---|
| Count-up numbers | easeOutCubic rAF, ~1000ms | Instant snap to value |
| Card hover lift | `translateY(-4px)`, 200ms | Opacity change only |
| Status badge pulse | `opacity: 1→0.6→1`, 2s infinite | Static (no animation) |
| Row expand/collapse | `max-height` slide, 250ms ease-out | Opacity fade, 150ms |
| Sidebar active glow | `box-shadow` transition, 200ms | Border color change only |
| Button hover | `background-color` transition, 200ms | Same (non-motion) |
| Focus ring | `ring` transition, 150ms | Same (non-motion) |

---

## 4. Responsive Breakpoints

| Viewport | Behavior |
|---|---|
| ≥1024px | Full layout: sidebar + main content, 3-column stats grid |
| 768px–1024px | Best-effort: sidebar may compress, 2-column stats grid, no pixel-perfect testing |
| <768px | Out of scope |

---

## 5. Font Loading Contract

| Property | Value |
|---|---|
| Font family | Inter |
| Weights | 400 (body), 500 (labels), 600 (subheadings), 700 (headings) |
| Source | Google Fonts CDN |
| Loading strategy | `<link>` in `<head>` with `preconnect`, `display=swap` |
| Fallback stack | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` |
