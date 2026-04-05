# Research: Frontend Modernization — React TypeScript, Zustand & SWR

**Generated**: 2026-04-05 | **Phase**: 0 | **Branch**: `002-react-ts-refactor`

All NEEDS CLARIFICATION items from Technical Context are resolved below.

---

## 1. Zustand Version & Installation

**Decision**: Install Zustand v5 (`^5.0.12`)

**Rationale**: Zustand v5 is the actively maintained current release. The `persist` middleware API is identical between v4 and v5. v5 fixes a concurrent rehydration race condition (v5.0.10), and post-rehydration callback receives latest state (v5.0.12). Project has no existing Zustand code to migrate so there is no downgrade pressure.

**Alternatives considered**: v4 — still works and API is identical for this use case, but v5 is preferred for new projects.

**Install command**: `npm install zustand@^5.0.12`

---

## 2. Zustand Auth Store — TypeScript Pattern

**Decision**: Single unified interface combining state and actions. Use the curried `create<T>()(...)` form for correct TypeScript inference.

**Rationale**: The official Zustand TypeScript documentation mandates the curried form `create<State>()((set, get) => ...)`. Splitting state and actions into separate interfaces adds noise and is explicitly discouraged.

**Store interface shape**:

```typescript
export interface AuthState {
  // Persisted (written to localStorage via persist)
  user: User | null
  tokens: Tokens | null

  // Transient (never persisted — initialized from defaults on every load)
  loading: boolean
  _hasHydrated: boolean

  // Hydration action
  setHasHydrated: (value: boolean) => void

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<User | undefined>
  forgotPassword: (email: string) => Promise<unknown>
  resetPassword: (token: string, newPassword: string) => Promise<unknown>
  changePassword: (currentPassword: string, newPassword: string) => Promise<unknown>
  verifyEmail: (token: string) => Promise<unknown>
  resendVerification: () => Promise<unknown>
}
```

**Key imports**:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
```

---

## 3. Zustand Persist Middleware — Partial Persistence

**Decision**: Use the `partialize` option to persist only `user` and `tokens`. The `loading` and `_hasHydrated` fields are never written to localStorage.

**Rationale**: `loading` is always `false` on startup (no request in flight). `_hasHydrated` is managed by the rehydration callback and must always start as `false`. Persisting them would be incorrect.

**Pattern**:

```typescript
{
  name: 'auth-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ user: state.user, tokens: state.tokens }),
  onRehydrateStorage: () => (state) => { state?.setHasHydrated(true) },
}
```

**localStorage key shape** (written by `persist`):
```json
{ "state": { "user": {...}, "tokens": {...} }, "version": 0 }
```

---

## 4. Hydration Detection Pattern

**Decision**: `_hasHydrated` boolean field in store, set via `onRehydrateStorage` callback.

**Rationale**: The `onRehydrateStorage` fires when localStorage rehydration completes. `_hasHydrated` is reactive (normal Zustand subscription); any component subscribing to it re-renders when the flag flips. The alternative — `useAuthStore.persist.hasHydrated()` — is non-reactive and must never be used in JSX.

For synchronous storage (`localStorage`), rehydration completes before the first React render, so the spinner appears for at most one frame. The pattern is still necessary to prevent a spurious redirect to `/login` for authenticated users on hard refresh.

**Gate usage in `ProtectedRoute`**:

```typescript
const hasHydrated = useAuthStore((state) => state._hasHydrated)
if (!hasHydrated) return <FullPageSpinner />
```

The same gate applies in `App.tsx` to prevent the sidebar and navigation from rendering with stale (pre-hydration) auth state.

---

## 5. Axios Interceptor Token Injection After Zustand Migration

**Decision**: Update the Axios request interceptor in `api.ts` to read tokens from `useAuthStore.getState().tokens` instead of `localStorage.getItem('tokens')`.

**Rationale**: After migration, tokens are stored in localStorage under the `auth-storage` key as a JSON blob with the shape `{ state: { user, tokens }, version }`. Directly reading `localStorage.getItem('tokens')` would return `null` (the key no longer exists). `useAuthStore.getState()` is a synchronous call that works outside the React tree — it is safe inside Axios interceptors.

```typescript
// In api.ts request interceptor:
import { useAuthStore } from './store/authStore'
const tokens = useAuthStore.getState().tokens
if (tokens?.access_token) {
  config.headers.Authorization = `Bearer ${tokens.access_token}`
}
```

**Note on token field names**: The existing `api.js` uses `tokens.access_token` and `tokens.refresh_token` from localStorage. The `AuthContext.jsx` stores `data.tokens` from the backend response directly. The backend response shape must be preserved in the Zustand store's `Tokens` interface — fields are `access_token` and `refresh_token` (not `access`/`refresh` as shown in some generic examples). Review `api.js` lines 12–15 to confirm.

---

## 6. Global SWR Configuration

**Decision**: Wrap the app in `<SWRConfig value={{ fetcher: axiosFetcher }}>` in `main.tsx`. No per-hook fetcher argument is needed.

**Fetcher implementation**:

```typescript
const axiosFetcher = (url: string) => api.get(url).then((res) => res.data)
```

**Rationale**: The `fetcher` field on `SWRConfig`'s `value` prop is typed as part of `PublicConfiguration` and is inherited by all child `useSWR` hooks that omit their own fetcher argument. This eliminates per-hook fetcher configuration and ensures every hook automatically uses the Axios instance with auth headers and the 401 retry interceptor.

---

## 7. SWR Cache Key Convention

**Decision**: Use URL path strings as SWR cache keys (`'/usage'`, `'/keys'`). Never use full URLs.

**Rationale**: The Axios instance has `baseURL` set to the API root. `api.get('/keys')` resolves correctly. Path strings are short, stable, environment-portable, and allow exact-match cache invalidation with `mutate('/keys')`.

**Parameterised fetches** (not currently needed, but pattern for reference): use array keys `['/endpoint', params]` with a destructuring fetcher.

---

## 8. SWR Cache Invalidation After Mutations

**Decision**: Use `useSWRMutation` for API key create and revoke operations.

**Rationale**: `useSWRMutation('/keys', mutationFetcher)` shares the same cache slot as `useSWR('/keys')`. After `trigger()` resolves, `useSWRMutation` marks `/keys` as stale with `revalidate: true` by default, causing `useSWR('/keys')` to re-fetch automatically. This is the idiomatic SWR v2 pattern — no manual `mutate()` call needed.

`useSWRMutation` also provides `isMutating` state for UI feedback (disabling buttons during in-flight requests).

**Import path**: `import useSWRMutation from 'swr/mutation'`

---

## 9. SWR TypeScript Generics

**Decision**: Always explicitly type both `Data` and `Error` generics: `useSWR<DataType, AxiosError>(key)`.

**Rationale**: SWR v2 does not infer the `Error` type from the fetcher return type — it defaults to `any`. Explicitly passing `AxiosError` (from `axios`) ensures type-safe access to `.response?.data?.detail` in error handlers.

`data` is `DataType | undefined` unless `fallbackData` or `suspense: true` is used (controlled by `BlockingData` conditional in SWR's type definitions).

---

## 10. Vite + TypeScript Configuration

**Decision**: Create `vite.config.ts` with explicit `@vitejs/plugin-react` registration. Create `tsconfig.json` and `tsconfig.node.json` following the official Vite 5 `create-vite` template.

**`vite.config.ts`** (complete file):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**`tsconfig.json`** (complete file):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`tsconfig.node.json`** (complete file):

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**Key choices**:
- `"moduleResolution": "bundler"` — TypeScript 5 mode for Vite/bundler environments; models how Vite actually resolves modules
- `"jsx": "react-jsx"` — React 17+ automatic transform; no `import React` needed in every `.tsx` file
- `"strict": true` — required by spec (FR-002) and compatible with React 18 + `@types/react` 18.x
- `"noEmit": true` — Vite handles bundling; TypeScript is only used for type-checking

**`index.html` change**: The script src must be explicitly updated from `/src/main.jsx` to `/src/main.tsx`. Vite does not fall back on extension — literal path resolution.

---

## 11. ESLint Configuration for TypeScript

**Decision**: Add `.eslintrc.cjs` with `@typescript-eslint/parser` and `plugin:@typescript-eslint/recommended`. Add `@typescript-eslint/parser@^7.x` and `@typescript-eslint/eslint-plugin@^7.x` as devDependencies.

**Rationale**: `@typescript-eslint/parser` is required to parse `.ts`/`.tsx` files. v7.x is compatible with ESLint 8 (v8.x requires ESLint 9). The `.cjs` extension is required because `package.json` sets `"type": "module"`, making all `.js` files ESM; ESLint 8's config loader requires CommonJS.

**Additional rules**:
- `react/react-in-jsx-scope: 'off'` — mandatory with `"jsx": "react-jsx"` (no `import React` needed)
- `react/prop-types: 'off'` — prop-types are redundant in TypeScript projects

**lint script update**: `"lint": "eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --max-warnings 0"`

---

## 12. Files to Create / Rename / Delete Summary

| File | Action | Notes |
|------|--------|-------|
| `frontend/vite.config.ts` | CREATE | Explicit React plugin |
| `frontend/tsconfig.json` | CREATE | Strict TS for browser code |
| `frontend/tsconfig.node.json` | CREATE | TS for vite.config.ts |
| `frontend/.eslintrc.cjs` | CREATE | TS-aware ESLint 8 config |
| `frontend/index.html` | MODIFY | `main.jsx` → `main.tsx` in script src |
| `frontend/package.json` | MODIFY | Add zustand dep; add @typescript-eslint devDeps; update lint script |
| `frontend/src/api.js` | RENAME → `api.ts` | Type Axios instance, update token read to useAuthStore.getState() |
| `frontend/src/main.jsx` | RENAME → `main.tsx` | Add SWRConfig provider, remove AuthProvider |
| `frontend/src/App.jsx` | RENAME → `App.tsx` | Remove AuthProvider import/usage; add hydration gate |
| `frontend/src/store/authStore.ts` | CREATE | Zustand store with persist |
| `frontend/src/types/index.ts` | CREATE | Shared interfaces (User, Tokens, ApiKey, UsageStats) |
| `frontend/src/hooks/useUsageStats.ts` | CREATE | SWR hook for GET /usage |
| `frontend/src/hooks/useApiKeys.ts` | CREATE | SWR hook for GET /keys (or inline in ApiKeyManager) |
| `frontend/src/components/ProtectedRoute.jsx` | RENAME → `.tsx` | Subscribe to authStore; add hydration gate |
| `frontend/src/components/ApiKeyManager.jsx` | RENAME → `.tsx` | Migrate to SWR + useSWRMutation |
| `frontend/src/pages/Dashboard.jsx` | RENAME → `.tsx` | Migrate to useSWR for /usage |
| `frontend/src/pages/auth/Login.jsx` | RENAME → `.tsx` | Use useAuthStore hook |
| `frontend/src/pages/auth/Register.jsx` | RENAME → `.tsx` | Use useAuthStore hook |
| `frontend/src/pages/auth/ForgotPassword.jsx` | RENAME → `.tsx` | Use useAuthStore hook |
| `frontend/src/pages/auth/ResetPassword.jsx` | RENAME → `.tsx` | Use useAuthStore hook |
| `frontend/src/pages/auth/VerifyEmail.jsx` | RENAME → `.tsx` | Use useAuthStore hook |
| `frontend/src/context/AuthContext.jsx` | DELETE | Replaced by authStore.ts |

**No NEEDS CLARIFICATION items remain.**
