# video_transcoding_api Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-10

## Active Technologies

- (002-react-ts-refactor)
- (003-add-tailwind-css) Tailwind CSS v4, @tailwindcss/vite Vite plugin, CSS-first @theme {} configuration

## Project Structure

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   │   └── auth/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── index.css   # Tailwind entry: @import + @source + @theme {}
│   └── App.tsx
├── vite.config.ts
└── package.json
```

## Commands

```bash
# Frontend development
cd frontend && npm run dev

# Frontend production build
cd frontend && npm run build
```

## Code Style

- TypeScript strict mode; all components typed with explicit return types
- Styling: Tailwind CSS v4 utility classes only — no inline style props, no separate CSS class rules
- Custom design tokens in @theme {} block in index.css; use token-named utilities (bg-brand, text-danger, etc.)
- Arbitrary Tailwind values (e.g., text-[15px], bg-[#f8f9fa]) are acceptable for one-off values not in the token set

## Recent Changes

- 002-react-ts-refactor: Added React 18 + TypeScript SPA with Vite, React Router, Zustand auth store
- 003-add-tailwind-css: Migrating all frontend styles to Tailwind CSS v4; replacing BEM classes and inline style objects with utility classes; custom design tokens in @theme {}

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
