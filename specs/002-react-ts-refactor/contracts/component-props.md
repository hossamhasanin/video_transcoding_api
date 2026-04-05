# Contract: Component Props & TypeScript Interfaces

**File**: `frontend/src/types/index.ts`  
**Consumers**: All `.tsx` source files

---

## Shared Type Definitions

All domain interfaces live in `src/types/index.ts` and are imported throughout the codebase.

```typescript
// frontend/src/types/index.ts

// ---------------------------------------------------------------------------
// Domain entities (mirrors backend response shapes)
// ---------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  full_name: string | null
  email_verified: boolean
}

export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string        // ISO 8601
}

export interface CreateApiKeyResponse {
  key_value: string         // shown once at creation; not stored
}

export interface UsageStats {
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  storage_used_bytes: number
  processed_minutes: number
}

// ---------------------------------------------------------------------------
// Auth store interface (also exported from authStore.ts; imported from types
// when needed outside the store module to avoid circular imports)
// ---------------------------------------------------------------------------

export interface AuthState {
  user: User | null
  tokens: Tokens | null
  loading: boolean
  _hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
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

---

## Component Props Contracts

### `ProtectedRoute`

```typescript
// frontend/src/components/ProtectedRoute.tsx

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Usage:
// <ProtectedRoute><Dashboard /></ProtectedRoute>
```

**Behaviour contract**:
1. If `_hasHydrated === false` → renders full-page loading spinner (no route decision)
2. If `_hasHydrated === true && !isAuthenticated` → renders `<Navigate to="/login" state={{ from: location }} replace />`
3. If `_hasHydrated === true && isAuthenticated` → renders `children`

---

### `App` (no external props)

```typescript
// frontend/src/App.tsx
// No props — root component
export default function App(): React.ReactElement
```

**Changes from current `App.jsx`**:
- Removes `<AuthProvider>` wrapper — Zustand stores are global singletons, no provider needed
- Adds global hydration gate via `_hasHydrated` check before rendering the Router + sidebar
- All route definitions remain identical
- `AppContent` reads auth state from `useAuthStore` directly

---

### `Dashboard` (no external props)

```typescript
// frontend/src/pages/Dashboard.tsx
export default function Dashboard(): React.ReactElement
```

**Internal state**: none (was `stats, loading, error` via `useState` — replaced by `useUsageStats()`)

---

### `ApiKeyManager` (no external props)

```typescript
// frontend/src/components/ApiKeyManager.tsx
export default function ApiKeyManager(): React.ReactElement
```

**Internal state**:
- `newKeyName: string` — controlled input for new key name
- `createdKey: string | null` — holds `key_value` from create response for one-time display

**External data**: all via `useApiKeys()`, `useCreateApiKey()`, `useRevokeApiKey()` hooks

---

### Auth Pages — Common Pattern

All auth pages follow this typed pattern:

```typescript
// Shared pattern across Login, Register, ForgotPassword, ResetPassword, VerifyEmail
export default function PageName(): React.ReactElement

// Internal state example (Login)
const [email, setEmail]       = useState<string>('')
const [password, setPassword] = useState<string>('')
const [error, setError]       = useState<string>('')
const [loading, setLoading]   = useState<boolean>(false)
```

**Auth action access** (replaces `useAuth()`):

```typescript
const login = useAuthStore((state) => state.login)
```

---

## `api.ts` Typed Axios Instance

```typescript
// frontend/src/api.ts (renamed from api.js)

import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from './store/authStore'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
})

// Request interceptor — reads tokens from Zustand store (NOT localStorage directly)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = useAuthStore.getState().tokens
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`
  }
  return config
})

// Response interceptor — token refresh on 401 (logic unchanged from api.js)
// Types: AxiosError is already imported by axios; isAxiosError() narrows type
```

**Breaking change from `api.js`**: the request interceptor previously read `localStorage.getItem('tokens')` and parsed JSON. After migration it reads `useAuthStore.getState().tokens` directly. The `auth-storage` localStorage key (written by Zustand `persist`) has a different shape and must not be read manually.

---

## Vite Environment Types

Add `vite/client` reference to a new `env.d.ts` file so `import.meta.env` is typed:

```typescript
// frontend/src/env.d.ts  (or add to vite-env.d.ts if it exists)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## Deletion Contract

The following file must be fully deleted (zero references may remain after migration):

| File | Deletion condition |
|------|-------------------|
| `frontend/src/context/AuthContext.jsx` | All 12 call sites migrated to `useAuthStore` |

**Zero-occurrence verification** (run after migration):

```bash
# Must return no results in frontend/src/
grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/
```
