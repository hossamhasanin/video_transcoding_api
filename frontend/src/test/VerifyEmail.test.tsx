import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VerifyEmail from '../pages/auth/VerifyEmail'
import { useAuthStore } from '../store/authStore'

const memoryRouterFuture = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
} as const

describe('VerifyEmail', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      loading: false,
      _hasHydrated: true,
    })
  })

  it('verifies a token only once in StrictMode', async () => {
    const verifyEmail = vi.fn().mockResolvedValue({ message: 'Verified' })
    const resendVerification = vi.fn().mockResolvedValue({ message: 'Resent' })

    useAuthStore.setState({ verifyEmail, resendVerification })

    render(
      <React.StrictMode>
        <MemoryRouter future={memoryRouterFuture} initialEntries={['/verify-email?token=abc']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>,
    )

    await screen.findByText('Email Verified!')

    expect(verifyEmail).toHaveBeenCalledTimes(1)
    expect(verifyEmail).toHaveBeenCalledWith('abc')
  })

  it('allows authenticated users to resend verification email after a failure', async () => {
    const verifyEmail = vi.fn().mockRejectedValue({ response: { data: { detail: 'Expired link.' } } })
    const resendVerification = vi.fn().mockResolvedValue({ message: 'Verification email sent!' })

    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        full_name: null,
        email_verified: false,
      },
      tokens: {
        access_token: 'access',
        refresh_token: 'refresh',
      },
      verifyEmail,
      resendVerification,
    })

    render(
      <MemoryRouter future={memoryRouterFuture} initialEntries={['/verify-email?token=expired']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Verification Failed')

    await userEvent.click(screen.getByRole('button', { name: 'Resend Verification Email' }))

    await screen.findByText('Verification email sent!')
    expect(resendVerification).toHaveBeenCalledTimes(1)
  })

  it('shows a sign in link for unauthenticated verification failures', async () => {
    const verifyEmail = vi.fn().mockRejectedValue({ response: { data: { detail: 'Expired link.' } } })

    useAuthStore.setState({ verifyEmail })

    render(
      <MemoryRouter future={memoryRouterFuture} initialEntries={['/verify-email?token=expired']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Verification Failed')

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
  })

  it('shows an invalid link state when the token is missing', async () => {
    render(
      <MemoryRouter future={memoryRouterFuture} initialEntries={['/verify-email']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
    })

    expect(screen.getByText('No verification token provided.')).toBeInTheDocument()
  })
})
