import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to verify your email.');
      });
  }, [searchParams]);

  return (
    <div className="card" style={{ maxWidth: 560, margin: '3rem auto', textAlign: 'center' }}>
      <h1>Email Verification</h1>
      <p>{message}</p>
      {status === 'success' && (
        <p>
          <Link to="/login">Go to sign in</Link>
        </p>
      )}
      {status === 'error' && (
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      )}
    </div>
  );
}
