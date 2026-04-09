import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom'
import { Zap, LayoutDashboard, FlaskConical, Key, LogOut, LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { useAuthStore, selectIsAuthenticated } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Playground from './pages/Playground'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import './index.css'

function AppContent(): React.ReactElement {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <Router
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <div className="flex min-h-screen font-sans bg-surface text-text-primary">
        <nav className="w-[250px] bg-gradient-to-b from-sidebar-from to-sidebar-to text-white p-5 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={24} className="text-accent" />
            <h2 className="mt-0 text-xl font-bold tracking-tight">TranscodeFlow</h2>
          </div>

          {isAuthenticated ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {(user?.email?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm text-white/90 truncate">{user?.email}</span>
                  {!user?.email_verified ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold mt-0.5 bg-warning/20 text-warning">
                      Unverified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold mt-0.5 bg-emerald-500/20 text-emerald-400">
                      <ShieldCheck size={10} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <ul className="list-none p-0 flex-1">
                <li className="mb-1">
                  <NavLink to="/" end className={({ isActive }) =>
                    `flex items-center gap-2.5 text-white no-underline text-sm font-medium rounded-lg px-3 py-2.5 transition-colors ${isActive
                      ? 'bg-sidebar-active border-l-2 border-accent shadow-[inset_4px_0_8px_var(--color-accent-glow)]'
                      : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
                    }`}>
                    <LayoutDashboard size={18} />
                    Dashboard
                  </NavLink>
                </li>
                <li className="mb-1">
                  <NavLink to="/playground" className={({ isActive }) =>
                    `flex items-center gap-2.5 text-white no-underline text-sm font-medium rounded-lg px-3 py-2.5 transition-colors ${isActive
                      ? 'bg-sidebar-active border-l-2 border-accent shadow-[inset_4px_0_8px_var(--color-accent-glow)]'
                      : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
                    }`}>
                    <FlaskConical size={18} />
                    Playground
                  </NavLink>
                </li>
                <li className="mb-1">
                  <NavLink to="/settings" className={({ isActive }) =>
                    `flex items-center gap-2.5 text-white no-underline text-sm font-medium rounded-lg px-3 py-2.5 transition-colors ${isActive
                      ? 'bg-sidebar-active border-l-2 border-accent shadow-[inset_4px_0_8px_var(--color-accent-glow)]'
                      : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
                    }`}>
                    <Key size={18} />
                    Settings
                  </NavLink>
                </li>
              </ul>
              <button
                onClick={logout}
                className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border-none rounded-lg cursor-pointer w-full text-sm transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <ul className="list-none p-0 flex-1">
              <li className="mb-1">
                <Link to="/login" className="flex items-center gap-2.5 text-white/80 no-underline text-sm font-medium rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-hover hover:text-white">
                  <LogIn size={18} />
                  Sign In
                </Link>
              </li>
              <li className="mb-1">
                <Link to="/register" className="flex items-center gap-2.5 text-white/80 no-underline text-sm font-medium rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-hover hover:text-white">
                  <UserPlus size={18} />
                  Create Account
                </Link>
              </li>
            </ul>
          )}
        </nav>

        <main className="flex-1 p-10">
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/playground" element={
              <ProtectedRoute>
                <Playground />
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function App(): React.ReactElement {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  return <AppContent />
}

export default App
