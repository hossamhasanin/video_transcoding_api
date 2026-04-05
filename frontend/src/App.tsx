import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuthStore, selectIsAuthenticated } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
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
      <div className="flex min-h-screen font-sans bg-page-bg text-[#333]">
        <nav className="w-[250px] bg-sidebar text-white p-5 flex flex-col">
          <h2 className="mt-0 text-2xl">TranscodeFlow</h2>

          {isAuthenticated ? (
            <>
              <div className="mb-5 p-3 bg-sidebar-user rounded">
                <span className="block text-sm text-[#ddd] break-all">{user?.email}</span>
                {!user?.email_verified && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 bg-warning text-warning-text">Unverified</span>
                )}
              </div>
              <ul className="list-none p-0 flex-1">
                <li className="mb-2.5"><Link to="/" className="text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover">Dashboard</Link></li>
                <li className="mb-2.5"><Link to="/settings" className="text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover">Settings</Link></li>
              </ul>
              <button onClick={logout} className="mt-auto px-4 py-2 bg-danger text-white border-none rounded cursor-pointer w-full text-sm hover:bg-danger-dark transition-colors">Sign Out</button>
            </>
          ) : (
            <ul className="list-none p-0 flex-1">
              <li className="mb-2.5"><Link to="/login" className="text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover">Sign In</Link></li>
              <li className="mb-2.5"><Link to="/register" className="text-white no-underline text-base block px-3 py-2 rounded transition-colors hover:bg-sidebar-hover">Create Account</Link></li>
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
