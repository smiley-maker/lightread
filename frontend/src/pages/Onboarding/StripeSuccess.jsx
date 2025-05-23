import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyCheckoutSession } from '../../lib/stripe';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import './Onboarding.css';

const StripeSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        setMessage('No payment session found. Please try again.');
        return;
      }

      try {
        const result = await verifyCheckoutSession(sessionId);
        
        if (result.success) {
          setStatus('success');
          setMessage('Payment successful! Welcome to LightRead Pro!');
          
          // Wait a moment then redirect to the next onboarding step
          setTimeout(() => {
            navigate('/onboarding/how-it-works');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support if this persists.');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setMessage('Failed to verify payment. Please contact support if this persists.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleContinue = () => {
    if (status === 'success') {
      navigate('/onboarding/how-it-works');
    } else {
      navigate('/onboarding/plan-selection');
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>Payment {status === 'success' ? 'Successful' : status === 'error' ? 'Failed' : 'Processing'}</h1>
        </div>

        <div className="payment-status">
          <div className="status-icon">
            {status === 'verifying' && (
              <Loader2 size={48} color="#8A66FF" className="spinning" />
            )}
            {status === 'success' && (
              <Check size={48} color="#4CAF50" />
            )}
            {status === 'error' && (
              <AlertCircle size={48} color="#f44336" />
            )}
          </div>

          <div className="status-message">
            <p>{message}</p>
          </div>

          {status !== 'verifying' && (
            <div className="onboarding-actions">
              <button className="btn btn-primary" onClick={handleContinue}>
                {status === 'success' ? 'Continue Setup' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeSuccess; 