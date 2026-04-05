# Contract: SWR Data Hooks

**Files**: `frontend/src/hooks/useUsageStats.ts`, `frontend/src/hooks/useApiKeys.ts`  
**Consumer**: `Dashboard.tsx`, `ApiKeyManager.tsx`  
**Replaces**: `useEffect` + `useState` fetch patterns in both components

---

## Global SWR Configuration

Set once in `frontend/src/main.tsx`. All child hooks inherit `fetcher` automatically.

```typescript
// frontend/src/main.tsx
import { SWRConfig } from 'swr'
import api from './api'

const axiosFetcher = (url: string) => api.get(url).then((res) => res.data)

// Wraps <App /> with the shared fetcher
<SWRConfig value={{ fetcher: axiosFetcher }}>
  <App />
</SWRConfig>
```

**Key invariants**:
- `fetcher` receives the SWR key (a URL path string) verbatim
- The Axios instance has `baseURL` set → `api.get('/usage')` resolves correctly
- Auth headers are injected by the Axios request interceptor (reads from `useAuthStore.getState()`)
- Token-refresh-on-401 is handled by the Axios response interceptor (unchanged)

---

## Hook: `useUsageStats`

**File**: `frontend/src/hooks/useUsageStats.ts`

```typescript
import useSWR from 'swr'
import type { AxiosError } from 'axios'
import type { UsageStats } from '../types'

export function useUsageStats() {
  const { data, error, isLoading } = useSWR<UsageStats, AxiosError>('/usage')
  return { stats: data, error, isLoading }
}
```

**Contract**:

| Return field | Type | Description |
|---|---|---|
| `stats` | `UsageStats \| undefined` | Usage data; `undefined` while loading |
| `error` | `AxiosError \| undefined` | Fetch error; `undefined` on success |
| `isLoading` | `boolean` | `true` on first fetch (no cached data) |

**Cache key**: `'/usage'`  
**Revalidation**: On mount, on window focus (SWR defaults). No manual invalidation needed (read-only resource).

**Usage** in `Dashboard.tsx`:

```typescript
const { stats, error, isLoading } = useUsageStats()
```

---

## Hook: `useApiKeys`

API key reads are collocated with mutations in `ApiKeyManager.tsx` using `useSWR` + `useSWRMutation` directly. A standalone `useApiKeys` hook is defined for clarity and reuse.

**File**: `frontend/src/hooks/useApiKeys.ts`

```typescript
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type { AxiosError } from 'axios'
import type { ApiKey, CreateApiKeyResponse } from '../types'
import api from '../api'

// Cache key — shared between useSWR and useSWRMutation for automatic invalidation
export const API_KEYS_CACHE_KEY = '/keys'

// READ hook
export function useApiKeys() {
  const { data, error, isLoading, mutate } =
    useSWR<ApiKey[], AxiosError>(API_KEYS_CACHE_KEY)
  return { keys: data ?? [], error, isLoading, mutate }
}

// Mutation fetchers
// MutationFetcher: (key, { arg }) => Promise<Data>
const createKeyFetcher = (
  _key: string,
  { arg }: { arg: { name: string } },
) => api.post<CreateApiKeyResponse>('/keys', arg).then((res) => res.data)

const revokeKeyFetcher = (
  _key: string,
  { arg }: { arg: string },  // arg = key id
) => api.delete(`/keys/${arg}`).then((res) => res.data)

// CREATE mutation hook
export function useCreateApiKey() {
  return useSWRMutation<
    CreateApiKeyResponse,  // Data returned by mutation
    AxiosError,            // Error type
    string,                // Cache key type
    { name: string }       // Argument type passed to trigger()
  >(API_KEYS_CACHE_KEY, createKeyFetcher)
  // Default revalidate:true → GET /keys cache is re-fetched after trigger() resolves
}

// REVOKE mutation hook
export function useRevokeApiKey() {
  return useSWRMutation<
    void,     // DELETE returns no body
    AxiosError,
    string,
    string    // arg = key id
  >(API_KEYS_CACHE_KEY, revokeKeyFetcher)
}
```

**Contract — `useApiKeys()`**:

| Return field | Type | Description |
|---|---|---|
| `keys` | `ApiKey[]` | API key list; `[]` while loading |
| `error` | `AxiosError \| undefined` | Fetch error |
| `isLoading` | `boolean` | `true` on first fetch |
| `mutate` | `KeyedMutator<ApiKey[]>` | Imperative revalidation (rarely needed) |

**Contract — `useCreateApiKey()`**:

| Return field | Type | Description |
|---|---|---|
| `trigger` | `(arg: { name: string }) => Promise<CreateApiKeyResponse>` | Call to fire POST /keys |
| `isMutating` | `boolean` | `true` while request is in-flight |
| `error` | `AxiosError \| undefined` | Error if creation failed |
| `data` | `CreateApiKeyResponse \| undefined` | Response on success (contains `key_value`) |

**Contract — `useRevokeApiKey()`**:

| Return field | Type | Description |
|---|---|---|
| `trigger` | `(arg: string) => Promise<void>` | Call with key `id` to fire DELETE /keys/:id |
| `isMutating` | `boolean` | `true` while request is in-flight |
| `error` | `AxiosError \| undefined` | Error if revocation failed |

**Cache invalidation behaviour**:  
`useSWR(API_KEYS_CACHE_KEY)` and `useSWRMutation(API_KEYS_CACHE_KEY, ...)` share the same SWR cache slot (`'/keys'`). When either mutation `trigger()` resolves, SWR marks `/keys` as stale (`revalidate: true` is the default). The `useSWR` subscriber re-fetches automatically. No explicit `mutate('/keys')` call is required.

---

## SWR Key Registry

| Key | Endpoint | Used by |
|-----|----------|---------|
| `'/usage'` | `GET /usage` | `useUsageStats` → `Dashboard.tsx` |
| `'/keys'` | `GET /keys` | `useApiKeys` + `useCreateApiKey` + `useRevokeApiKey` → `ApiKeyManager.tsx` |

---

## Error Handling Pattern

All SWR hooks surface errors the same way — via the `error` return field. Components follow this consistent pattern:

```typescript
if (error) {
  return (
    <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px' }}>
      {error.response?.data?.detail ?? error.message}
    </div>
  )
}
```

This is identical behaviour to the existing manual `useEffect` error handling (which also renders `err.response?.data?.detail`).
