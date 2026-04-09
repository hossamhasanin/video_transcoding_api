import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function Register(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await register(email, password, fullName)
      navigate('/', { replace: true })
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } }
      const detail = e.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        setError(detail.map((d) => d.msg).join('. '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { test: password.length >= 8, text: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { test: /[a-z]/.test(password), text: 'One lowercase letter' },
    { test: /\d/.test(password), text: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/~`]/.test(password), text: 'One special character' },
  ]

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-b from-surface to-white">
      <div className="bg-surface-raised p-10 rounded-2xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-text-primary text-2xl font-bold">Create Account</h1>
        <p className="text-text-secondary mb-6 text-[15px]">Start transcoding videos with TranscodeFlow</p>

        {error && <div className="bg-danger-bg text-danger-text px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="fullName" className="block mb-1.5 font-medium text-sm text-text-primary">Full Name (optional)</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow"
            />
          </div>

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

          <div className="mb-5">
            <label htmlFor="password" className="block mb-1.5 font-medium text-sm text-text-primary">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow"
            />
            {password && (
              <div className="mt-2 text-xs">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className={req.test ? 'py-0.5 text-emerald-600' : 'py-0.5 text-text-tertiary'}>
                    {req.test ? '✓' : '○'} {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block mb-1.5 font-medium text-sm text-text-primary">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow"
            />
            {confirmPassword && password !== confirmPassword && (
              <div className="text-danger text-xs mt-1">Passwords do not match</div>
            )}
          </div>

          <button type="submit" className="w-full py-3 bg-accent hover:bg-accent-hover text-white border-none rounded-lg text-base font-medium cursor-pointer transition-colors disabled:bg-muted disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-text-secondary text-sm">
          Already have an account? <Link to="/login" className="text-accent no-underline font-medium hover:text-accent-hover">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
