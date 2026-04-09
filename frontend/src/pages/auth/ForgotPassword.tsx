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
      <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-b from-surface to-white">
        <div className="bg-surface-raised p-10 rounded-2xl shadow-auth-card w-full max-w-auth">
          <h1 className="m-0 mb-2 text-text-primary text-2xl font-bold">Check Your Email</h1>
          <p className="text-text-secondary mb-6 text-[15px]">
            If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <p className="text-text-tertiary mb-6 text-sm">
            The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
          </p>
          <Link to="/login" className="block text-center no-underline w-full py-3 bg-accent hover:bg-accent-hover text-white border-none rounded-lg text-base font-medium transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-b from-surface to-white">
      <div className="bg-surface-raised p-10 rounded-2xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-text-primary text-2xl font-bold">Forgot Password</h1>
        <p className="text-text-secondary mb-6 text-[15px]">Enter your email and we&apos;ll send you a reset link</p>

        {error && <div className="bg-danger-bg text-danger-text px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block mb-1.5 font-medium text-sm text-text-primary">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-accent hover:bg-accent-hover text-white border-none rounded-lg text-base font-medium cursor-pointer transition-colors disabled:bg-muted disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center mt-6 text-text-secondary text-sm">
          Remember your password? <Link to="/login" className="text-accent no-underline font-medium hover:text-accent-hover">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
