import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore'

function VerifyEmail(): React.ReactElement {
  const [searchParams] = useSearchParams()
  const token: string | null = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState<string>('')
  const verifyEmail = useAuthStore((s) => s.verifyEmail)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success')
        setMessage((data as { message?: string }).message || 'Email verified successfully!')
      })
      .catch((err: unknown) => {
        setStatus('error')
        const e = err as { response?: { data?: { detail?: string } } }
        setMessage(e.response?.data?.detail || 'Verification failed. The link may have expired.')
      })
  }, [token, verifyEmail])

  const handleResend = async (): Promise<void> => {
    try {
      const data = await resendVerification()
      setMessage((data as { message?: string }).message || 'Verification email sent!')
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } }
      setMessage(e.response?.data?.detail || 'Failed to resend verification email.')
    }
  }

  if (status === 'verifying') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Verifying...</h1>
          <p className="auth-subtitle">Please wait while we verify your email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{status === 'success' ? 'Email Verified!' : 'Verification Failed'}</h1>
        <p className="auth-subtitle">{message}</p>

        {status === 'success' ? (
          <Link to="/" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go to Dashboard
          </Link>
        ) : (
          <>
            {isAuthenticated && (
              <button onClick={handleResend} className="auth-btn">
                Resend Verification Email
              </button>
            )}
            {!isAuthenticated && (
              <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Sign In
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
