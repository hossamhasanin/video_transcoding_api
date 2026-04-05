import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore'

const inFlightVerificationRequests = new Map<string, Promise<unknown>>()

const verifyEmailOnce = (
  token: string,
  verifyEmail: (token: string) => Promise<unknown>,
): Promise<unknown> => {
  const existingRequest = inFlightVerificationRequests.get(token)

  if (existingRequest) {
    return existingRequest
  }

  const request = verifyEmail(token).finally(() => {
    inFlightVerificationRequests.delete(token)
  })

  inFlightVerificationRequests.set(token, request)

  return request
}

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

    let isActive = true

    verifyEmailOnce(token, verifyEmail)
      .then((data) => {
        if (!isActive) {
          return
        }

        setStatus('success')
        setMessage((data as { message?: string }).message || 'Email verified successfully!')
      })
      .catch((err: unknown) => {
        if (!isActive) {
          return
        }

        setStatus('error')
        const e = err as { response?: { data?: { detail?: string } } }
        setMessage(e.response?.data?.detail || 'Verification failed. The link may have expired.')
      })

    return () => {
      isActive = false
    }
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
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
          <h1 className="m-0 mb-2 text-[28px] text-sidebar">Verifying...</h1>
          <p className="text-[#666] mb-6 text-[15px]">Please wait while we verify your email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-10 rounded-xl shadow-auth-card w-full max-w-auth">
        <h1 className="m-0 mb-2 text-[28px] text-sidebar">{status === 'success' ? 'Email Verified!' : 'Verification Failed'}</h1>
        <p className="text-[#666] mb-6 text-[15px]">{message}</p>

        {status === 'success' ? (
          <Link to="/" className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors">
            Go to Dashboard
          </Link>
        ) : (
          <>
            {isAuthenticated && (
              <button onClick={handleResend} className="w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-muted disabled:cursor-not-allowed">
                Resend Verification Email
              </button>
            )}
            {!isAuthenticated && (
              <Link to="/login" className="block text-center no-underline w-full py-3 bg-brand text-white border-none rounded-md text-base font-medium hover:bg-brand-dark transition-colors">
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
