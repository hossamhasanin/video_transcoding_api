# Research: Dashboard Visual Redesign

**Feature Branch**: `005-dashboard-redesign`
**Date**: 2026-04-09

## 1. Color Palette — Replacing Bootstrap Defaults

### Decision
Replace the current Bootstrap-inspired palette (`#007bff` brand, `#1a1a1a` sidebar, `#f4f7f6` page background) with a curated, modern palette centered on an electric indigo accent (`#6366f1`) and warm dark tones for the sidebar. Define all colors as semantic design tokens in the `@theme {}` block.

**New palette core:**
| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#6366f1` (Indigo 500) | Primary interactive color, active states, links |
| `--color-accent-hover` | `#4f46e5` (Indigo 600) | Hover states for buttons, links |
| `--color-accent-glow` | `rgba(99, 102, 241, 0.25)` | Focus rings, active indicators |
| `--color-surface` | `#f8f9fc` | Page background (warmer than current `#f4f7f6`) |
| `--color-surface-raised` | `#ffffff` | Cards, panels |
| `--color-surface-overlay` | `rgba(255, 255, 255, 0.7)` | Glassmorphism overlays |
| `--color-sidebar-from` | `#1e1b4b` (Indigo 950) | Sidebar gradient start (deep warm indigo) |
| `--color-sidebar-to` | `#312e81` (Indigo 900) | Sidebar gradient end |
| `--color-sidebar-hover` | `rgba(255, 255, 255, 0.08)` | Sidebar link hover |
| `--color-text-primary` | `#1e293b` (Slate 800) | Body text |
| `--color-text-secondary` | `#64748b` (Slate 500) | Labels, muted text |

### Rationale
- Indigo is distinctive from the generic Bootstrap blue while maintaining professional authority suitable for a developer tool.
- The warm dark sidebar gradient (`#1e1b4b → #312e81`) replaces the flat `#1a1a1a` black, giving depth and brand identity.
- A layered surface system (base → raised → overlay) creates visual hierarchy without relying on heavy shadows.
- All tokens use semantic names (`accent`, `surface`, `text-primary`) for maintainability — components reference tokens, not hex values.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Teal accent (#14b8a6) | Too close to many SaaS dashboards (Vercel, Supabase); less distinctive |
| Gradient accent (multi-color) | Overly flashy for a developer tool; harder to maintain contrast ratios |
| Keep blue, change sidebar only | Doesn't satisfy SC-002 (visually distinct from Bootstrap defaults) |

---

## 2. Typography — Inter from Google Fonts

### Decision
Load Inter (weights 400, 500, 600, 700) from Google Fonts CDN via `<link>` tags in `index.html` with `preconnect` hints and `font-display=swap`. Define the font stack as `--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` in `@theme {}`.

### Rationale
- The `<link>` approach is the recommended method; `@import` in CSS creates render-blocking requests.
- `font-display: swap` ensures immediate text rendering with the fallback stack, satisfying FR-007's "immediate text rendering with fallback font stack" requirement.
- `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` reduces connection latency by ~100-200ms.
- Loading only four weights (400, 500, 600, 700) keeps the request under 60KB total, well within the 500ms page load budget (SC-006).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Self-hosting Inter WOFF2 | Adds build complexity; CDN is sufficient for initial version per spec assumptions |
| `@import` in index.css | Render-blocking; worse performance than `<link>` in HTML |
| Outfit or Roboto fonts | Inter is the industry-standard choice for developer tools (GitHub, Linear, Vercel) |

---

## 3. Icon Library — Lucide React

### Decision
Install `lucide-react` as a production dependency. Use individual named icon imports for tree-shaking. Icons used for stats cards (e.g., `Briefcase`, `CheckCircle`, `AlertCircle`, `HardDrive`, `Clock`), sidebar navigation, and empty states.

### Rationale
- Lucide is explicitly mentioned in the spec as an approved icon set (alongside Heroicons).
- `lucide-react` is tree-shakable — each icon is ~400 bytes, unbundled icons are excluded.
- Compatible with React 19 (confirmed in their GitHub issues and release notes).
- Consistent stroke-based design language that pairs well with Inter typography.
- Over 1500+ icons available, covering all needed metrics and navigation icons.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Heroicons | Slightly smaller set; lucide-react has better React DX with props like `size`, `strokeWidth` |
| Font Awesome | Heavy bundle; icon font approach contradicts spec assumption of no heavy icon font libraries |
| Inline custom SVGs | Maintenance overhead for 10+ icons; no advantage over tree-shakable library |

---

## 4. Glassmorphism — Tailwind CSS v4 Implementation

### Decision
Use Tailwind's native `backdrop-blur-md` combined with semi-transparent backgrounds (`bg-white/70`) and subtle borders (`border border-white/20`) for glassmorphism effects on stats cards and table headers. No additional libraries needed.

### Rationale
- Tailwind CSS v4 provides all necessary backdrop-filter utilities natively (`backdrop-blur-sm` through `backdrop-blur-3xl`).
- The pattern `backdrop-blur-md bg-white/70 border border-white/20 rounded-xl shadow-lg` produces a polished frosted glass effect.
- Works in all target browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+) — `backdrop-filter` has full support in all targets.
- No JavaScript required — pure CSS approach.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| CSS `filter: blur()` | Blurs the element itself, not the backdrop — wrong effect |
| `glass-morphism` npm package | Unnecessary dependency; Tailwind utilities are sufficient |
| Skip glassmorphism, use gradients only | Spec explicitly mentions "glassmorphism effect" (Story 2, Story 3) |

---

## 5. Count-Up Animation — React Hook with requestAnimationFrame

### Decision
Create a custom `useCountUp(targetValue, duration)` hook using `requestAnimationFrame` with easeOutCubic interpolation. The hook returns the current animated value and respects `prefers-reduced-motion` by instantly snapping to the target value.

### Rationale
- Stats card values come from an API (dynamic), ruling out a pure CSS `@property` + `counter()` approach which requires known values at build time.
- `requestAnimationFrame` provides 60fps performance with no janky `setInterval` updates.
- easeOutCubic gives a professional "decelerate" feel — fast start, gentle landing — matching premium dashboard aesthetics.
- The `prefers-reduced-motion` check satisfies FR-012 (replace motion animations with instant state changes).
- Encapsulating in a reusable hook keeps Dashboard.tsx clean and makes the animation testable in isolation.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| CSS `@property --num` animation | Requires values at CSS-time; stats are API-fetched at runtime |
| `react-countup` npm package | Adds dependency for ~30 lines of hook logic; unnecessary |
| `setInterval` approach | Inconsistent frame timing; janky on lower-end devices |

---

## 6. Reduced Motion Support Strategy

### Decision
Define all motion-based animations (translateY, scale, slide, pulse) inside a `@media (prefers-reduced-motion: no-preference)` opt-in block, and provide crossfade/opacity-only fallbacks as the default. In JavaScript (`useCountUp`), detect `prefers-reduced-motion` via `window.matchMedia` and snap to the final value immediately.

### Rationale
- The spec requires FR-012: "replacing motion-based animations with crossfade/opacity-only transitions."
- The "opt-in" approach (motion only when user has `no-preference`) is safer — if the media query is unsupported, users get the reduced-motion experience by default.
- CSS handles hover lifts, pulse badges, and slide animations; JS handles count-up animation. Both paths need coverage.
- This approach satisfies WCAG 2.1 SC 2.3.3 (Animation from Interactions).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Remove all animations when `reduce` is set | Spec says "crossfade/opacity transitions remain" — not a full disable |
| Only handle in CSS, ignore JS animations | Count-up hook uses `requestAnimationFrame` — needs explicit JS handling |
| Single global `animation: none` override | Too aggressive; breaks opacity transitions that should remain |

---

## 7. Sidebar Redesign — Gradient, Glow Indicators, Avatar

### Decision
Replace the flat `bg-sidebar` class with a gradient background (`bg-gradient-to-b from-sidebar-from to-sidebar-to`). Active nav links get a left border accent with accent glow (`border-l-2 border-accent shadow-[inset_4px_0_8px_var(--color-accent-glow)]`). User profile section gets a circular avatar with initials derived from the user's email (first letter, uppercased), displayed in a `w-9 h-9 rounded-full bg-accent` circle.

### Rationale
- Gradient sidebar is the single highest-impact visual change (Story 1 priority P1).
- The animated left-border accent replaces the flat `bg-sidebar-hover` active state, providing a distinctive active indicator per AC-003.
- Initials-based avatar avoids external avatar services and works immediately with existing data (user.email).
- Verification badge styling reuses `bg-accent` token for visual consistency.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Transparent sidebar with page gradient | Complex layering; sidebar content readability suffers |
| Icon-only collapsed sidebar | Scope creep; spec doesn't request layout changes |
| Gravatar for user avatar | External dependency; unnecessary for a placeholder approach |

---

## 8. Job History Table — Frosted Header, Animated Badges, Slide Panels

### Decision
- **Table header**: Apply `backdrop-blur-sm bg-white/80 sticky top-0` for a frosted/semi-transparent header that floats over scrolled rows.
- **Status badges**: Active states (processing, transcoding, uploading) get a `animate-pulse` CSS animation class; terminal states (completed, failed) are static.
- **Expanded rows**: Add `animate-slideDown` keyframe (`max-height: 0 → max-height: 300px` with `ease-out`) for smooth open/close.
- **Filters**: Style as pill-shaped selectors with `rounded-full px-3 py-1 border border-[--color-accent]/20`.
- All animations degrade to opacity-only under `prefers-reduced-motion`.

### Rationale
- The frosted header keeps column labels visible during scroll while maintaining the glass aesthetic.
- Pulse animation on active badges (2s infinite, subtle opacity oscillation) satisfies FR-005 and provides visual feedback for in-progress jobs.
- Slide-down animation gives a polished feel to row expansion (FR-006).
- Pill-shaped filters match the premium aesthetic described in Story 3 AC-004.

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Virtual scrolled table (react-window) | Layout complexity; current table handles 20 rows per page fine |
| Accordion component library | Over-engineering for a single expanded row; native implementation is simpler |
| CSS Grid for table layout | Would require restructuring from `<table>` to `<div>` grid; breaks semantic HTML |

---

## 9. Stats Cards — Bento Grid, Glassmorphism, Icons

### Decision
Replace the current `flex gap-5 flex-wrap` with a CSS Grid bento-inspired layout: 3 columns on desktop (≥1024px), 2 columns on tablet-like widths. Each card gets:
- A distinct accent color gradient on the left border or icon background
- A Lucide icon representing the metric
- Glassmorphism background (`backdrop-blur-sm bg-white/80`)
- Count-up animation on the numeric value
- Hover lift effect (`hover:-translate-y-1 hover:shadow-lg transition-all`)

**Card-to-icon mapping:**
| Stat | Icon | Accent |
|---|---|---|
| Total Jobs | `Briefcase` | Indigo |
| Completed | `CheckCircle2` | Emerald |
| Failed | `AlertCircle` | Rose |
| Storage Used | `HardDrive` | Amber |
| Processed Time | `Clock` | Cyan |

### Rationale
- CSS Grid with `auto-fill, minmax(280px, 1fr)` creates a responsive bento layout without media queries.
- Each card having a unique accent prevents visual monotony (current: all cards use the same blue).
- Icon + number + label creates a scannable visual hierarchy.
- Glassmorphism differentiates from flat white Bootstrap cards (SC-002).

### Alternatives Considered
| Alternative | Why Rejected |
|---|---|
| Chart/sparkline per card | Requires historical data not available from current `/usage` endpoint; scope creep |
| Masonry layout | Overkill for 5 equal-height cards; CSS Grid is simpler |
| Opaque gradient cards | Less distinctive than glassmorphism; spec explicitly requests the effect |
