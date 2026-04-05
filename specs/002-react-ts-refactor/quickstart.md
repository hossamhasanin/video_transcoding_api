# Quickstart: Frontend Modernization — React TypeScript, Zustand & SWR

**Branch**: `002-react-ts-refactor` | **Generated**: 2026-04-05

This guide walks a developer through setting up the migrated frontend from a fresh checkout and verifying all acceptance criteria.

---

## Prerequisites

- Node.js ≥ 18 installed
- The backend API running (or pointing at a staging environment via `.env`)
- Git checkout of branch `002-react-ts-refactor`

---

## 1. Install Dependencies

```bash
cd frontend
npm install
```

Expected new packages after migration:
- `zustand@^5.0.12` (runtime dependency — auth state management)
- `@typescript-eslint/parser@^7.x` (devDependency)
- `@typescript-eslint/eslint-plugin@^7.x` (devDependency)

`swr@2.2.5` was already installed; no version change.

---

## 2. Configure Environment

```bash
# Copy the example env if not already present
cp ../.env.example ../.env
```

The frontend reads one variable:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

Set in `../.env` (project root) or `frontend/.env.local` (local override):
```
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 3. Run the Development Server

```bash
cd frontend
npm run dev
```

Vite will start at `http://localhost:5173`. The first run after migration confirms:
- `vite.config.ts` loads without error (React plugin registered)
- `tsconfig.json` is picked up (no type errors in editor)
- The app compiles and hot-reloads

---

## 4. Verify TypeScript Build (SC-001, SC-002)

```bash
cd frontend
npm run build
```

**Expected output**:
```
✓ TypeScript compiled — 0 errors
✓ dist/ built successfully
```

**If errors appear**: all TypeScript errors are genuine — do not suppress with `@ts-ignore` or `any` casts. Fix the root cause per FR-009.

**Verify no `.jsx`/`.js` source files remain**:
```bash
find frontend/src -name "*.jsx" -o -name "*.js" | grep -v node_modules
# Expected: no output
```

---

## 5. Verify Auth Store Migration (SC-005)

After migration, `AuthContext` must be completely removed:

```bash
grep -r "AuthContext\|useContext\|AuthProvider" frontend/src/
# Expected: no output
```

Also verify Zustand store is used correctly:

```bash
grep -r "useAuthStore" frontend/src/
# Expected: results in App.tsx, ProtectedRoute.tsx, Dashboard.tsx,
#           ApiKeyManager.tsx, all pages under pages/auth/
```

---

## 6. Verify Hydration Spinner Behaviour (User Story 2, Acceptance 1)

1. Open the app in a browser with existing localStorage session:
   ```
   localStorage.getItem('auth-storage')  // should return a JSON blob
   ```
2. Hard-refresh the page (Ctrl+R / Cmd+R)
3. **Expected**: A full-page "Loading..." spinner appears briefly during Zustand `persist` rehydration, then the Dashboard loads without redirecting to Login

To simulate the spinner visibly (since localStorage is synchronous and fast):
1. Open DevTools → Application → Storage → Clear all Local Storage
2. Hard-refresh → user is unauthenticated → redirects to Login (correct)
3. Log in → navigate to Dashboard → hard-refresh → spinner → Dashboard (session restored)

---

## 7. Verify SWR Data Fetching (User Story 3)

### Dashboard — usage stats

1. Navigate to `/` (Dashboard)
2. Open DevTools → Network tab
3. Verify `GET /usage` fires on mount
4. **Expected**: loading indicator appears while fetch is in-flight, then stats display correctly

### ApiKeyManager — key list

1. On Dashboard, scroll to the API Keys section
2. Verify `GET /keys` fires on mount
3. **Expected**: key list renders; no `useEffect` is used (verified by reading `ApiKeyManager.tsx`)

### Cache invalidation — create

1. Enter a name in the "New Key Name" field, click "Create Key"
2. **Expected**:
   - Green banner appears with the one-time key value
   - The key list automatically updates (new key appears) — no page reload needed
   - Network tab shows `POST /keys` followed immediately by `GET /keys` (SWR revalidation)

### Cache invalidation — revoke

1. Click "Revoke" on any key, confirm the dialog
2. **Expected**:
   - The key disappears from the list automatically
   - Network tab shows `DELETE /keys/:id` followed by `GET /keys`

---

## 8. Full Auth Flow Verification (SC-003)

Walk through all user flows to confirm zero regressions:

| Flow | Steps | Expected |
|------|-------|----------|
| **Register** | `/register` → fill form → submit | Account created; redirected to Dashboard |
| **Login** | `/login` → credentials → submit | Logged in; redirected to intended destination |
| **Logout** | Click Logout in sidebar | Session cleared; redirected to `/login` |
| **Forgot Password** | `/forgot-password` → email → submit | Confirmation screen shown |
| **Reset Password** | Follow emailed link → `/reset-password?token=...` | Password updated; success screen |
| **Verify Email** | Follow emailed link → `/verify-email?token=...` | "Verified" success screen |
| **Protected Route** | Visit `/` without session | Redirected to `/login` with `?from` preserved |
| **Session Restore** | Log in → close tab → reopen | Already logged in; Dashboard loads directly |
| **Expired Token** | Backend returns 401 on refresh | Axios interceptor clears session; redirect to Login (existing behaviour preserved) |

---

## 9. Run Linting

```bash
cd frontend
npm run lint
```

**Expected**: zero warnings or errors (`--max-warnings 0` flag).

After migration, the lint command covers `.ts` and `.tsx` files in addition to `.js`/`.jsx`:
```json
"lint": "eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --max-warnings 0"
```

---

## 10. File Verification Checklist

Run these checks to confirm the migration is complete:

```bash
# 1. No .jsx or .js source files remain (CSS and config are exempt)
find frontend/src -name "*.jsx" -o -name "*.js"
# Expected: empty

# 2. No AuthContext references
grep -r "AuthContext\|AuthProvider" frontend/src/
# Expected: empty

# 3. No useContext calls (Zustand replaces all context usage)
grep -r "useContext" frontend/src/
# Expected: empty

# 4. No useEffect-based data fetching (only SWR hooks for /usage and /keys)
grep -r "useEffect" frontend/src/pages/Dashboard.tsx frontend/src/components/ApiKeyManager.tsx
# Expected: empty (other files may still use useEffect for non-fetch purposes)

# 5. SWR hooks in place
grep -r "useSWR" frontend/src/
# Expected: results in Dashboard.tsx (or useUsageStats.ts) and ApiKeyManager.tsx (or useApiKeys.ts)

# 6. Auth store used correctly
grep -r "useAuthStore" frontend/src/
# Expected: results in all auth pages + App.tsx + ProtectedRoute.tsx
```

---

## Common Issues

### `Cannot find module 'zustand'`

Run `npm install` in the `frontend/` directory.

### TypeScript error: `Property 'X' does not exist on type 'UsageStats'`

The backend response field name differs from what is typed in `src/types/index.ts`. Inspect the actual API response in DevTools Network tab and update the interface accordingly.

### Hydration spinner appears on every navigation

`_hasHydrated` is being reset to `false` unintentionally. Check that `_hasHydrated` is **excluded** from the store's `partialize` function — it should never be written to or read from localStorage.

### SWR does not revalidate after create/revoke

Verify that both `useSWRMutation` calls use `API_KEYS_CACHE_KEY` (`'/keys'`) as the first argument — the cache key must be identical to the `useSWR` key string for automatic invalidation to trigger.

### `Access-Control-Allow-Origin` error in browser

The backend is not running or `VITE_API_URL` points to the wrong host. Check `.env` and confirm the backend is up.
