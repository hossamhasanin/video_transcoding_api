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
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
          <h1 className="m-0 mb-2 text-[28px] text-sidebar">Invalid Link</h1>
          <p className="text-[#666] mb-6 text-[15px]">This password reset link is invalid or missing.</p>
          <Link to="/forgot-password" className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
          <h1 className="m-0 mb-2 text-[28px] text-sidebar">Password Reset!</h1>
          <p className="text-[#666] mb-6 text-[15px]">Your password has been changed successfully.</p>
          <Link to="/login" className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors">
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
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-[28px] text-sidebar">Reset Password</h1>
        <p className="text-[#666] mb-6 text-[15px]">Enter your new password</p>

        {error && <div className="bg-danger-bg text-danger-text px-4 py-3 rounded-md mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="password" className="block mb-1.5 font-medium text-sm text-[#444]">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              autoFocus
              minLength={8}
              className="w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
            />
            {password && (
              <div className="mt-2 text-xs">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className={req.test ? 'py-0.5 text-[#28a745]' : 'py-0.5 text-[#999]'}>
                    {req.test ? '✓' : '○'} {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block mb-1.5 font-medium text-sm text-[#444]">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
            />
            {confirmPassword && password !== confirmPassword && (
              <div className="text-danger text-xs mt-1">Passwords do not match</div>
            )}
          </div>

          <button type="submit" className="w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
