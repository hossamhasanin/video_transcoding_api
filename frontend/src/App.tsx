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
    <Router>
      <div className="layout">
        <nav className="sidebar">
          <h2>TranscodeFlow</h2>

          {isAuthenticated ? (
            <>
              <div className="user-info">
                <span className="user-email">{user?.email}</span>
                {!user?.email_verified && (
                  <span className="badge badge-warning">Unverified</span>
                )}
              </div>
              <ul>
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/settings">Settings</Link></li>
              </ul>
              <button onClick={logout} className="logout-btn">Sign Out</button>
            </>
          ) : (
            <ul>
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
            </ul>
          )}
        </nav>

        <main className="content">
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return <AppContent />
}

export default App
