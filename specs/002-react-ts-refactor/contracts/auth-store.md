# Contract: Auth Store (`useAuthStore`)

**File**: `frontend/src/store/authStore.ts`  
**Consumer**: All components that need auth state or auth actions  
**Replaces**: `src/context/AuthContext.jsx` + `useAuth()` hook

---

## Store Hook

```typescript
import { useAuthStore, selectIsAuthenticated } from '../store/authStore'
```

The store is a global Zustand singleton. No `Provider` wrapper is required.

---

## State Selectors

Components subscribe to individual slices to minimise re-renders.

```typescript
// User object (null when logged out)
const user = useAuthStore((state) => state.user)

// Whether persist middleware has finished reading from localStorage.
// All route decisions MUST be suspended until this is true.
const hasHydrated = useAuthStore((state) => state._hasHydrated)

// Derived: user is authenticated (user !== null && tokens !== null)
const isAuthenticated = useAuthStore(selectIsAuthenticated)

// Auth operations in progress (login / register)
const loading = useAuthStore((state) => state.loading)
```

---

## Actions

All actions are accessed via `useAuthStore` selectors.

### `login(email, password)`

```typescript
// Signature
login: (email: string, password: string) => Promise<void>

// Usage
const login = useAuthStore((state) => state.login)
await login(email, password)
// On success: store.user and store.tokens are set; loading returns to false
// On failure: throws AxiosError; loading returns to false
```

**POST** `/auth/login`  
**Effect**: sets `user`, `tokens`, `loading: false`. Both are persisted.

---

### `register(email, password, fullName?)`

```typescript
register: (email: string, password: string, fullName?: string) => Promise<void>
```

**POST** `/auth/register`  
**Effect**: sets `user`, `tokens` on success. `fullName` maps to `full_name` in request body.

---

### `logout()`

```typescript
logout: () => void
```

**Effect**: sets `user: null`, `tokens: null`. Persist middleware writes nulls to localStorage. Caller is responsible for navigation (`navigate('/login')`).

---

### `refreshProfile()`

```typescript
refreshProfile: () => Promise<User | undefined>
```

**GET** `/auth/me`  
**Effect**: updates `user` on success; calls `logout()` on failure (401).  
Returns the updated `User` or `undefined` on error.

---

### `forgotPassword(email)`

```typescript
forgotPassword: (email: string) => Promise<unknown>
```

**POST** `/auth/forgot-password`  
**Effect**: none on store state. Returns response data. Throws on error.

---

### `resetPassword(token, newPassword)`

```typescript
resetPassword: (token: string, newPassword: string) => Promise<unknown>
```

**POST** `/auth/reset-password` with `{ token, new_password: newPassword }`  
**Effect**: none on store state. Throws on error.

---

### `changePassword(currentPassword, newPassword)`

```typescript
changePassword: (currentPassword: string, newPassword: string) => Promise<unknown>
```

**POST** `/auth/change-password` with `{ current_password, new_password }`  
**Effect**: none on store state. Currently not called from any UI (preserved from AuthContext).

---

### `verifyEmail(token)`

```typescript
verifyEmail: (token: string) => Promise<unknown>
```

**GET** `/auth/verify-email?token={token}`  
**Effect**: none on store state. Throws on error.

---

### `resendVerification()`

```typescript
resendVerification: () => Promise<unknown>
```

**POST** `/auth/resend-verification`  
**Effect**: none on store state. Throws on error.

---

## Hydration Gate Pattern

Any component that renders conditionally based on auth state MUST check `_hasHydrated` first.

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const hasHydrated     = useAuthStore((state) => state._hasHydrated)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const location        = useLocation()

  if (!hasHydrated) {
    // Full-page spinner: blocks ALL route evaluation during localStorage rehydration
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
```

---

## Outside-React Access

For Axios interceptors and other non-React code:

```typescript
import { useAuthStore } from './store/authStore'

// Read current state synchronously (safe; no hook rules apply)
const tokens = useAuthStore.getState().tokens

// Dispatch an action
useAuthStore.getState().logout()
```

---

## Backward Compatibility

| Old (`AuthContext.jsx`) | New (`authStore.ts`) | Notes |
|-------------------------|----------------------|-------|
| `useAuth().user` | `useAuthStore(s => s.user)` | Same shape |
| `useAuth().loading` | `useAuthStore(s => s.loading)` | Same semantics |
| `useAuth().isAuthenticated` | `useAuthStore(selectIsAuthenticated)` | Same derived value |
| `useAuth().login(...)` | `useAuthStore(s => s.login)(...)` | Same call signature |
| `useAuth().logout()` | `useAuthStore(s => s.logout)()` | Same; caller navigates |
| `<AuthContext.Provider>` | *(removed)* | No provider needed |
| `useContext(AuthContext)` | *(removed)* | Zero occurrences after migration |
