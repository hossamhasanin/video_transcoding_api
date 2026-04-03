import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const { verifyEmail, resendVerification, user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.');
      });
  }, [token, verifyEmail]);

  const handleResend = async () => {
    try {
      const data = await resendVerification();
      setMessage(data.message || 'Verification email sent!');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to resend verification email.');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Verifying...</h1>
          <p className="auth-subtitle">Please wait while we verify your email.</p>
        </div>
      </div>
    );
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
  );
}

export default VerifyEmail;
