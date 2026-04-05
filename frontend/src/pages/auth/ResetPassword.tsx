import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function ResetPassword(): React.ReactElement {
  const [searchParams] = useSearchParams()
  const token: string | null = searchParams.get('token')

  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const resetPassword = useAuthStore((s) => s.resetPassword)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await resetPassword(token!, password)
      setSuccess(true)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invalid Link</h1>
          <p className="auth-subtitle">This password reset link is invalid or missing.</p>
          <Link to="/forgot-password" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password Reset!</h1>
          <p className="auth-subtitle">Your password has been changed successfully.</p>
          <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const passwordRequirements = [
    { test: password.length >= 8, text: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { test: /[a-z]/.test(password), text: 'One lowercase letter' },
    { test: /\d/.test(password), text: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/~`]/.test(password), text: 'One special character' },
  ]

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your new password</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              autoFocus
              minLength={8}
            />
            {password && (
              <div className="password-requirements">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className={`req-item ${req.test ? 'req-met' : 'req-unmet'}`}>
                    {req.test ? '✓' : '○'} {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <div className="field-error">Passwords do not match</div>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
