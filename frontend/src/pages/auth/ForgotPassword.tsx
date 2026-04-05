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
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
          <h1 className="m-0 mb-2 text-[28px] text-sidebar">Check Your Email</h1>
          <p className="text-[#666] mb-6 text-[15px]">
            If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <p className="text-[#888] mb-6 text-[14px]">
            The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
          </p>
          <Link to="/login" className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-[28px] text-sidebar">Forgot Password</h1>
        <p className="text-[#666] mb-6 text-[15px]">Enter your email and we&apos;ll send you a reset link</p>

        {error && <div className="bg-danger-bg text-danger-text px-4 py-3 rounded-md mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block mb-1.5 font-medium text-sm text-[#444]">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center mt-6 text-[#666] text-sm">
          Remember your password? <Link to="/login" className="text-brand no-underline font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
