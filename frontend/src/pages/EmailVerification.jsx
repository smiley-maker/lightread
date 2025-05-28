import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './EmailVerification.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'email') {
          setError('Invalid verification link');
          setVerificationStatus('error');
          return;
        }

        const { error: verificationError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        });

        if (verificationError) {
          throw verificationError;
        }

        setVerificationStatus('success');
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (err) {
        console.error('Error verifying email:', err);
        setError(err.message);
        setVerificationStatus('error');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="email-verification-page">
      <div className="verification-container">
        {verificationStatus === 'verifying' && (
          <div className="verification-status">
            <h2>Verifying your email...</h2>
            <div className="loading-spinner"></div>
          </div>
        )}
        
        {verificationStatus === 'success' && (
          <div className="verification-status success">
            <h2>Email Verified Successfully!</h2>
            <p>Your email has been verified. Redirecting to dashboard...</p>
          </div>
        )}
        
        {verificationStatus === 'error' && (
          <div className="verification-status error">
            <h2>Verification Failed</h2>
            <p>{error || 'There was an error verifying your email. Please try again.'}</p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification; 