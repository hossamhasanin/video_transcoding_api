# Data Model: Frontend Modernization — React TypeScript, Zustand & SWR

**Generated**: 2026-04-05 | **Phase**: 1 | **Branch**: `002-react-ts-refactor`

This document defines all TypeScript interfaces, state shapes, and state transitions for the refactored frontend. All types live in `frontend/src/types/index.ts` and are imported from there throughout the codebase.

---

## Entities

### 1. `User`

Represents the authenticated user's identity.

```typescript
// frontend/src/types/index.ts

export interface User {
  id: string
  email: string
  full_name: string | null
  email_verified: boolean
}
```

**Source**: Derived from existing `AuthContext.jsx` usage — fields accessed are `user.email`, `user.email_verified`. The `id` and `full_name` fields are assumed from the backend `GET /auth/me` response schema.

**Validation rules**:
- `email` is always present (required by backend auth)
- `full_name` is nullable (optional during registration)
- `email_verified` controls the sidebar "Unverified" badge display

**Persistence**: `user` is persisted to `localStorage` via Zustand `persist` (`auth-storage` key, under `.state.user`).

---

### 2. `Tokens`

Represents the auth token pair for a session.

```typescript
export interface Tokens {
  access_token: string
  refresh_token: string
}
```

**Source**: Field names `access_token` and `refresh_token` are taken directly from the existing `api.js` interceptor which reads `tokens.access_token` and `tokens.refresh_token` from `localStorage`.

**Persistence**: `tokens` is persisted to `localStorage` via Zustand `persist` (`auth-storage` key, under `.state.tokens`).

**Important**: The Axios request interceptor in `api.ts` must read `useAuthStore.getState().tokens?.access_token` (not `localStorage.getItem('tokens')` — that key no longer exists after migration).

---

### 3. `ApiKey`

Represents a named API credential.

```typescript
export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string   // ISO 8601 date string from backend
}
```

**Source**: Derived from `ApiKeyManager.jsx` field accesses: `k.id`, `k.name`, `k.key_prefix`, `k.created_at`.

**Relationships**: Belongs to the authenticated `User` (keyed by auth context in backend).

**State**: No client-side state transitions — the list is server-authoritative and fetched fresh via SWR on mount and after mutations.

---

### 4. `CreateApiKeyResponse`

The shape of the `POST /keys` response (one-time key reveal).

```typescript
export interface CreateApiKeyResponse {
  key_value: string   // full key shown once; not stored by backend
}
```

**Note**: `key_value` is displayed to the user in a dismissible green banner immediately after creation. It is held in local component state (`useState<string | null>`) only — never persisted. The response also likely includes the new `ApiKey` record; SWR cache invalidation handles reflecting it in the list without needing to parse the create response.

---

### 5. `UsageStats`

Represents aggregated usage metrics for the current user.

```typescript
export interface UsageStats {
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  storage_used_bytes: number
  processed_minutes: number
}
```

**Source**: Derived from `Dashboard.jsx` field accesses. Display formatting applied at render time (not stored):
- `storage_used_bytes` → displayed as `(bytes / (1024 * 1024)).toFixed(2) MB`
- `processed_minutes` → displayed as `N mins`

**Fetching**: `useSWR<UsageStats, AxiosError>('/usage')` — global Axios fetcher from `SWRConfig`.

---

## Auth Store State Shape

The complete runtime state of the Zustand auth store.

### Persisted fields (written to `localStorage` under key `auth-storage`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | `User \| null` | `null` | Authenticated user; null when logged out |
| `tokens` | `Tokens \| null` | `null` | Access + refresh token pair; null when logged out |

### Transient fields (never persisted; always reset to default on every page load)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `loading` | `boolean` | `false` | True during async auth operations (login, register) |
| `_hasHydrated` | `boolean` | `false` | True after Zustand `persist` finishes reading from localStorage; gates route evaluation |

### Derived selector (not stored in state)

```typescript
// Exported selector — use in any component:
export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.user !== null && state.tokens !== null
```

---

## State Transitions

### Auth Session

```
           Page load
               │
               ▼
    ┌─────────────────────┐
    │ _hasHydrated: false  │  ← spinner shown, all routes blocked
    │ user: null           │
    │ tokens: null         │
    └──────────┬──────────┘
               │ onRehydrateStorage fires
               ▼
    ┌─────────────────────────────┐
    │ _hasHydrated: true           │
    │ user: restored | null        │
    │ tokens: restored | null      │
    └─┬─────────────────────────┬─┘
      │ user != null             │ user == null
      ▼                          ▼
  Authenticated               Unauthenticated
  → Dashboard                 → Login (redirect)

  login(email, pwd)
      │ loading: true
      │
      ▼
  POST /auth/login
      │ success
      ├── user: User
      ├── tokens: Tokens
      └── loading: false → Authenticated

  logout()
      │
      ▼
  user: null, tokens: null → Unauthenticated
```

### SWR Data — API Keys

```
  Component mounts
       │
       ▼
  useSWR('/keys')
  isLoading: true
       │ fetch completes
       ▼
  data: ApiKey[]
  isLoading: false
       │
       ├── triggerCreate({ name })  ──► POST /keys ──► useSWRMutation revalidates
       │                                               '/keys' cache → re-fetch
       └── triggerRevoke(id)        ──► DELETE /keys/:id ──► same
```

---

## localStorage Key Map (Post-Migration)

| Key | Owner | Shape |
|-----|-------|-------|
| `auth-storage` | Zustand `persist` | `{ state: { user: User\|null, tokens: Tokens\|null }, version: 0 }` |
| ~~`tokens`~~ | ~~AuthContext~~ | DELETED — no longer used |
| ~~`user`~~ | ~~AuthContext~~ | DELETED — no longer used |

Migration note: if a user has existing `tokens` / `user` keys in localStorage from before the migration, the Zustand store will simply not find `auth-storage` on first load and will treat the session as unauthenticated (requiring a new login). This is acceptable per the spec (scope-limited refactor; no data migration required).
