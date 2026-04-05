# Research: Add Tailwind CSS Styling Support

**Feature**: `003-add-tailwind-css`  
**Phase**: 0 — Research & Unknowns Resolution  
**Date**: 2026-04-05

---

## Research Item 1: Tailwind CSS v4 Installation with Vite

**Decision**: Install `tailwindcss` (v4) and `@tailwindcss/vite` as devDependencies; register the Tailwind Vite plugin in `vite.config.ts`.

**Rationale**: Tailwind CSS v4 ships a dedicated first-party Vite plugin (`@tailwindcss/vite`) that integrates directly into Vite's build pipeline. This replaces the v3 PostCSS approach. The plugin handles class scanning, JIT generation, and HMR automatically when used with Vite.

**Installation commands**:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

**vite.config.ts change**:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

**Alternatives considered**:
- PostCSS + `tailwindcss` (v3 approach): Rejected — spec requires v4 which is CSS-first and the Vite plugin is the canonical integration method.
- CDN script tag: Rejected — no tree-shaking; unsuitable for production builds.

---

## Research Item 2: CSS-First Configuration (`@theme {}`)

**Decision**: Use a single `@theme {}` block in `frontend/src/index.css` to define all custom design tokens. No `tailwind.config.js` or `tailwind.config.ts` file is created.

**Rationale**: Tailwind v4 removes the JS config file entirely. All configuration (custom colors, shadows, spacing, font sizes, max-widths) is expressed directly in CSS via `@theme {}` design variable blocks. Custom properties defined under `@theme {}` become both CSS custom properties (`--color-*`) and Tailwind utility modifiers (e.g., `bg-brand`, `text-danger`).

**`@theme {}` variable naming convention**:
- Colors: `--color-<name>` → generates `bg-<name>`, `text-<name>`, `border-<name>`
- Shadows: `--shadow-<name>` → generates `shadow-<name>`
- Spacing/sizing: `--spacing-<name>` → generates `p-<name>`, `m-<name>`, etc.
- Width/max-width: `--max-width-<name>` → generates `max-w-<name>`

**Alternatives considered**:
- Defining a `tailwind.config.ts` and using the v4 interop compatibility layer: Rejected — spec explicitly requires v4 CSS-first; no JS config.
- Using standard Tailwind defaults only and approximating colors: Rejected — SC-001 mandates zero visual regression, and key brand colors diverge from Tailwind defaults (see Research Item 4).

---

## Research Item 3: `@source` Directive and Class Detection Scope

**Decision**: Add `@source "../src/**"` in `frontend/src/index.css` to scope Tailwind's class detection to `frontend/src/` only.

**Rationale**: In Tailwind v4 with the Vite plugin, `@source` directives tell the scanner which paths to watch for utility class usage. Paths are resolved relative to the CSS file's location. Since `index.css` is at `frontend/src/index.css`, `"../src/**"` resolves to the entire `frontend/src/` tree — all `.tsx`, `.ts`, `.html` files within it. This prevents the scanner from picking up class names from Python backend files, Docker configs, or other non-frontend directories.

**Actual spec assumption reconciliation**: The spec states `@source "./frontend/**"` — this was written from the perspective of a path relative to the project root. When expressed from within the CSS file at `frontend/src/index.css`, the equivalent is `"../src/**"` (for `frontend/src/`) or `"../**"` (for all of `frontend/`). Using `"../src/**"` is more precise — it only covers source files, not `node_modules`, `dist`, or `tests`.

**Alternatives considered**:
- No `@source` directive (use Vite plugin auto-detection only): Rejected — explicit scoping is required per spec (FR-008); auto-detection could pick up unintended paths.
- `@source "../../**"` (entire repo): Rejected — violates FR-008 (scoped to frontend only).

---

## Research Item 4: Preflight Audit — Conflicts with Existing `index.css`

**Decision**: The existing `index.css` body reset rules (`margin: 0`, font-family stack) overlap with Tailwind v4 preflight. These MUST be removed before adding `@import "tailwindcss"`.

**Preflight audit results** — rules in `index.css` that conflict with / duplicate Tailwind v4 preflight:

| Existing Rule | Tailwind v4 Preflight Equivalent | Action |
|---------------|----------------------------------|--------|
| `body { margin: 0 }` | Preflight resets all margins to 0 | Remove |
| `body { font-family: ... }` | Preflight does not set a custom font stack | Migrate to `body` class in App.tsx or `@layer base` with `font-sans` (after extending sans font stack in `@theme`) |
| `* { box-sizing: border-box }` (implied by form inputs) | Preflight sets `box-sizing: border-box` globally | Already covered by preflight |

**Remaining in index.css after migration** (per SC-004 and spec clarifications):
```css
@import "tailwindcss";
@source "../src/**";

@theme {
  /* Custom design tokens — see data-model.md */
}
```

No `@keyframes` blocks exist in the current `index.css`. No complex pseudo-selector rules (`:nth-child`, `:has`) exist in the current `index.css`. All hover/focus states in the current CSS are expressible as Tailwind `hover:` and `focus:` variants.

**Alternatives considered**:
- Keeping the body font-family rule in `index.css` as a "legitimate base style": Rejected — SC-004 allows only `@keyframes`, complex pseudo-selectors, `@theme {}`, and `@import`. A `body { font-family }` rule does not qualify. It must be expressed via `@theme { --font-sans: ... }` and applied via Tailwind's `font-sans` utility or a base layer override.

---

## Research Item 5: Custom Design Token Necessity

**Decision**: 16 custom design tokens are required in `@theme {}`. Standard Tailwind defaults do not provide accurate-enough approximations for zero visual regression.

**Token extraction from current codebase**:

| Token | Current Value | Nearest Tailwind Default | Delta / Action |
|-------|---------------|--------------------------|----------------|
| Primary blue (buttons, links, focus) | `#007bff` | `blue-500` = `#3b82f6` | Visually distinct — define `--color-brand: #007bff` |
| Primary blue hover | `#0056b3` | — | Define `--color-brand-dark: #0056b3` |
| Primary blue disabled | `#6c757d` | `gray-500` = `#6b7280` | 1-digit off — define `--color-muted: #6c757d` for exactness |
| Danger red (logout, revoke, errors) | `#dc3545` | `red-600` = `#dc2626` | Close but not identical — define `--color-danger: #dc3545` |
| Danger red hover | `#c82333` | — | Define `--color-danger-dark: #c82333` |
| Error banner bg | `#f8d7da` | `red-100` = `#fee2e2` | Different — define `--color-danger-bg: #f8d7da` |
| Error banner text | `#721c24` | `red-800` = `#991b1b` | Different — define `--color-danger-text: #721c24` |
| Success banner bg | `#d4edda` | `green-100` = `#dcfce7` | Different — define `--color-success-bg: #d4edda` |
| Success banner text | `#155724` | `green-800` = `#166534` | Close but define `--color-success-text: #155724` |
| Warning badge bg | `#ffc107` | `yellow-400` = `#facc15` | Different hue — define `--color-warning: #ffc107` |
| Page background | `#f4f7f6` | `gray-100` = `#f3f4f6` | 1 digit diff — define `--color-page-bg: #f4f7f6` |
| Sidebar background | `#1a1a1a` | `neutral-900` = `#171717` | Close — define `--color-sidebar: #1a1a1a` |
| Sidebar hover bg | `#333333` | `neutral-800` = `#262626` | Different — define `--color-sidebar-hover: #333` |
| Sidebar user-info bg | `#2a2a2a` | — | Define `--color-sidebar-user: #2a2a2a` |
| Auth card shadow | `0 4px 20px rgba(0,0,0,0.08)` | `shadow-md` = different values | Define `--shadow-auth-card` |
| Auth card max-width | `420px` | none | Define `--max-w-auth: 420px` |

**Alternatives considered**:
- Approximate with nearest Tailwind defaults: Rejected — SC-001 requires zero visual regressions; color delta visible to human eye especially for brand blue (`#007bff` vs `#3b82f6`).
- Use arbitrary values in JSX (e.g., `bg-[#007bff]`): Rejected — custom tokens defined in `@theme {}` produce clean utility names, keep JSX readable, and are the spec-mandated approach.

---

## Research Item 6: Font Stack Configuration

**Decision**: Define `--font-sans` in `@theme {}` to override Tailwind v4's default sans-serif stack with the existing system font stack.

**Rationale**: The existing `body { font-family }` rule uses `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. Tailwind v4's default `--font-sans` uses a similar but not identical stack (`ui-sans-serif, system-ui, sans-serif, ...`). To guarantee SC-001, the existing font stack should be replicated exactly in `@theme {}`, and then `font-sans` applied on `<body>` via a class in `index.html` or the root `<div>` in App.tsx.

**`@theme {}` entry**:
```css
@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

Apply via: add `font-sans` to the outermost div/body wrapper in `App.tsx`, or add `class="font-sans"` to `<body>` in `index.html`.

---

## Research Item 7: `box-sizing` Behaviour with Tailwind Preflight

**Decision**: Tailwind v4 preflight sets `box-sizing: border-box` globally. The existing `index.css` does not have an explicit `box-sizing` reset, but form inputs use `box-sizing: border-box` inline in `.form-group input`. This is fully handled by preflight — no action needed.

**Rationale**: Preflight includes `*, ::before, ::after { box-sizing: border-box }`. This is compatible with and supersedes the `.form-group input { box-sizing: border-box }` rule, which can be safely removed.

---

## Summary of Resolved Unknowns

| # | Unknown | Resolution |
|---|---------|------------|
| 1 | Tailwind v4 + Vite integration mechanism | `@tailwindcss/vite` plugin |
| 2 | CSS-first config approach | `@theme {}` in `index.css`, no JS config |
| 3 | `@source` path for class scanning | `@source "../src/**"` in `index.css` |
| 4 | Preflight conflicts with existing CSS | 2 body rules overlap; remove before `@import` |
| 5 | Which tokens need `@theme {}` vs Tailwind defaults | 16 custom tokens required for zero visual regression |
| 6 | Font stack handling | `--font-sans` in `@theme {}`; apply `font-sans` at root |
| 7 | `box-sizing` handling | Preflight handles it; existing rule removed |
