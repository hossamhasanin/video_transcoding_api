import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function Login(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-[28px] text-sidebar">Welcome Back</h1>
        <p className="text-[#666] mb-6 text-[15px]">Sign in to your TranscodeFlow account</p>

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

          <div className="mb-5">
            <label htmlFor="password" className="block mb-1.5 font-medium text-sm text-[#444]">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="w-full px-3.5 py-2.5 border border-[#ddd] rounded-md text-[15px] transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
            />
          </div>

          <div className="text-right mb-5">
            <Link to="/forgot-password" className="text-brand no-underline font-medium hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" className="w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-6 text-[#666] text-sm">
          Don&apos;t have an account? <Link to="/register" className="text-brand no-underline font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
