# Quickstart: Dashboard Visual Redesign

**Feature Branch**: `005-dashboard-redesign`
**Date**: 2026-04-09

---

## Prerequisites

- Frontend running (`cd frontend && npm run dev`)
- Backend running (for API data on Dashboard — existing setup)
- An authenticated user account with at least one job for table testing

## What Changed

The dashboard has been visually redesigned. **No backend changes, new routes, or new features** were added. All existing functionality works identically — only the visual presentation has been upgraded.

### At a Glance

| Before | After |
|---|---|
| Flat `#1a1a1a` black sidebar | Deep indigo gradient sidebar with glow indicators |
| System font stack | Inter from Google Fonts |
| `#007bff` Bootstrap blue accent | `#6366f1` electric indigo accent |
| Flat white stat cards | Glassmorphism cards with icons, count-up animations |
| Basic bordered table | Frosted header, animated badges, slide-down panels |
| Plain HTML API key table | Card-based layout with styled inputs |
| Generic auth page forms | Premium card with accent styling, background treatment |

## Getting Started

### 1. Install New Dependency

```bash
cd frontend
npm install lucide-react
```

### 2. Start the Dev Server

```bash
cd frontend
npm run dev
```

### 3. Verify the Redesign

Open the dashboard in a browser and check:

- [ ] Sidebar shows deep indigo gradient background (not flat black)
- [ ] "TranscodeFlow" has a logo icon beside it
- [ ] Active nav link shows accent glow indicator
- [ ] User avatar shows initials in a circular badge
- [ ] Stats cards have icons, glassmorphism effect, and count-up animation
- [ ] Stats cards lift on hover with shadow deepening
- [ ] Job table header has frosted/semi-transparent appearance
- [ ] Active status badges (processing/transcoding) pulse subtly
- [ ] Clicking a job row slides the detail panel down smoothly
- [ ] Filter dropdowns are pill-shaped
- [ ] API keys use card-based layout with monospace prefix tags
- [ ] Body text uses Inter font
- [ ] All accent colors are indigo (not blue)

### 4. Test Reduced Motion

On macOS: **System Settings → Accessibility → Display → Reduce motion**

Verify:
- [ ] Count-up numbers snap to final value instantly
- [ ] Cards don't translateY on hover (opacity change only)
- [ ] Status badges don't pulse
- [ ] Row expansion fades in (no slide)

### 5. Test Responsive (Best-Effort)

Resize browser to 768px–1024px wide:
- [ ] Layout doesn't break
- [ ] Stats cards reflow to 2 columns
- [ ] Table remains scrollable

## Development

### Frontend

```bash
cd frontend
npm run dev          # Start dev server
npm run typecheck    # Verify types
npm test             # Run Vitest suite
npm run build        # Verify production build
```

### Key Files

| File | Purpose |
|---|---|
| `frontend/src/index.css` | Design token system (all colors, shadows, fonts, animations) |
| `frontend/src/App.tsx` | Sidebar layout (gradient, nav links, avatar, logo) |
| `frontend/src/pages/Dashboard.tsx` | Stats cards (icons, glassmorphism, count-up, grid) |
| `frontend/src/components/JobHistory.tsx` | Table redesign (frosted header, badges, slide panels, pill filters) |
| `frontend/src/components/ApiKeyManager.tsx` | Card-based key display, styled inputs |
| `frontend/src/hooks/useCountUp.ts` | Animated number hook (requestAnimationFrame) |
| `frontend/src/pages/auth/*.tsx` | Auth pages with new palette and typography |
| `frontend/index.html` | Google Fonts `<link>` tags with preconnect |

### Design Token Reference

All tokens are defined in `index.css` `@theme {}`. Key tokens:

```css
--color-accent:         #6366f1   /* Primary interactive color */
--color-accent-hover:   #4f46e5   /* Hover state */
--color-surface:        #f8f9fc   /* Page background */
--color-surface-raised: #ffffff   /* Cards, panels */
--color-sidebar-from:   #1e1b4b  /* Sidebar gradient start */
--color-sidebar-to:     #312e81  /* Sidebar gradient end */
--color-text-primary:   #1e293b  /* Body text */
--color-text-secondary: #64748b  /* Muted text */
--font-sans: 'Inter', ...        /* Primary font stack */
```

### Adding a New Design Token

1. Add the token to `@theme {}` in `index.css`
2. Use via Tailwind utility: `bg-{token-name}`, `text-{token-name}`, etc.
3. Never hardcode hex values in component files
