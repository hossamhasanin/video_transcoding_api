# Quickstart: Add Tailwind CSS Styling Support

**Feature**: `003-add-tailwind-css`  
**Phase**: 1 — Design  
**Date**: 2026-04-05

This guide shows how to set up the Tailwind CSS v4 environment for this feature branch and verify the integration works before beginning component migration.

---

## Prerequisites

- Node.js 18+ installed (current system: v22.17.1)
- Working directory: `video_transcoding_api/frontend/`

---

## Step 1: Install Tailwind CSS v4 and the Vite Plugin

```bash
cd frontend
npm install -D tailwindcss @tailwindcss/vite
```

**Expected result**: `tailwindcss` and `@tailwindcss/vite` appear in `frontend/package.json` `devDependencies`.

---

## Step 2: Register the Vite Plugin

Edit `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

> **Order matters**: `tailwindcss()` must be listed before `react()`.

---

## Step 3: Replace `index.css`

Replace the entire content of `frontend/src/index.css` with:

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

> At this point the app will lose all styling (existing CSS classes are removed and no Tailwind classes have been applied yet). This is expected. Proceed to migrate components.

---

## Step 4: Verify the Build Toolchain Works

Before migrating any components, verify Tailwind is processing the CSS correctly:

```bash
# From frontend/
npm run dev
```

Open the browser. The app will be unstyled — but the build should produce NO errors. If `vite` throws errors at this point, fix them before proceeding.

Also run a production build to confirm no warnings:

```bash
npm run build
```

Expected: `✓ built in Xs` with no Tailwind-related errors.

---

## Step 5: Migrate Components (in order)

Follow `data-model.md` mappings. Recommended migration order:

1. **`App.tsx`** — restores layout/sidebar/content structure immediately (makes all pages visible again)
2. **`ProtectedRoute.tsx`** — simple, single inline style
3. **`Login.tsx`** — validates auth class mappings
4. **`Register.tsx`** — adds password requirements classes
5. **`ForgotPassword.tsx`**, **`ResetPassword.tsx`**, **`VerifyEmail.tsx`** — repeat auth pattern + inline Link styles
6. **`Dashboard.tsx`** — replaces `cardStyle` and `statStyle` consts
7. **`ApiKeyManager.tsx`** — largest migration; all inline styles

After each component, verify in the running dev server that visual appearance matches the pre-migration design.

---

## Step 6: Verify SC-004 — Final `index.css` Check

After all components are migrated, confirm `index.css` contains ONLY:
- `@import "tailwindcss"`
- `@source "../src/**"`
- `@theme {}` block

No other rules should remain. Run a grep as a sanity check:

```bash
# Should return only the @import, @source, and @theme lines
cat frontend/src/index.css
```

---

## Step 7: Verify SC-003 — No Inline Styles in Dashboard and ApiKeyManager

```bash
grep -n 'style={{' frontend/src/pages/Dashboard.tsx
grep -n 'style={{' frontend/src/components/ApiKeyManager.tsx
```

Both commands should return no output.

---

## Step 8: Final Build Check (SC-005)

```bash
cd frontend && npm run build
```

Expected: clean build, no CSS warnings, no Tailwind errors.

---

## Reference: Tailwind v4 Utility Quick Reference

For common patterns used in this migration:

| Need | Tailwind class |
|------|---------------|
| Flex container | `flex` |
| Flex column | `flex-col` |
| Center items | `items-center justify-center` |
| Full height | `h-screen` or `min-h-screen` |
| Full width | `w-full` |
| Padding 20px | `p-5` |
| Padding 40px | `p-10` |
| Margin bottom 20px | `mb-5` |
| Border radius 4px | `rounded` |
| Border radius 6px | `rounded-md` |
| Border radius 8px | `rounded-lg` |
| Border radius 12px | `rounded-xl` |
| Font size 12px | `text-xs` |
| Font size 14px | `text-sm` |
| Font size 15px | `text-[15px]` (arbitrary) |
| Font size 16px | `text-base` |
| Font size 24px | `text-2xl` |
| Font size 28px | `text-[28px]` (arbitrary) |
| Font weight 500 | `font-medium` |
| Font weight bold | `font-bold` |
| Hover state | `hover:<utility>` |
| Focus ring (3px brand/10) | `focus:ring-[3px] focus:ring-brand/10` |
| Disabled cursor | `disabled:cursor-not-allowed` |
| Word break all | `break-all` |
| Transition colors | `transition-colors` |
| Custom color token | `bg-brand`, `text-danger`, etc. |
| Arbitrary color | `bg-[#f8f9fa]`, `text-[#666]` |
| Arbitrary max-width | `max-w-auth` (custom token) |
| Flex grow shorthand | `flex-[1_1_150px]` (arbitrary) |
