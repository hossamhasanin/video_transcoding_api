import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function ForgotPassword(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [sent, setSent] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const forgotPassword = useAuthStore((s) => s.forgotPassword)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check Your Email</h1>
          <p className="auth-subtitle">
            If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <p className="auth-subtitle" style={{ fontSize: '14px', color: '#888' }}>
            The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
          </p>
          <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
