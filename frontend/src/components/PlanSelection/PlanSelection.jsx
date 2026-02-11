import { useState } from 'react';
import './PlanSelection.css';
import { supabase } from '../../lib/supabase';
import { createCheckoutSession } from '../../lib/stripe';

const PlanSelection = ({ user, onComplete }) => {
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Stripe price ID from environment variables
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID;

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user || !user.id) {
        throw new Error('User is not authenticated. Please log in and try again.');
      }
      
      // Current date for timestamps
      const now = new Date();
      
      // Calculate end date (1 month later for pro, or far future for free plan)
      const endDate = new Date(now);
      if (selectedPlan === 'pro') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // For free plan, set a far future date (10 years)
        endDate.setFullYear(endDate.getFullYear() + 10);
      }
      
      // Insert subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: selectedPlan,
          status: 'active',
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });
      
      if (subError) {
        console.error('Error inserting subscription record:', subError);
        throw new Error(subError.message);
      }
      
      // If pro plan is selected, redirect to Stripe checkout
      if (selectedPlan === 'pro') {
        try {
          // Store the user email locally so it can be sent with the API request
          localStorage.setItem('userEmail', user.email || '');
          // Redirect to checkout
          await createCheckoutSession(STRIPE_PRICE_ID);
          return; // Don't call onComplete as we're redirecting to Stripe
        } catch (err) {
          console.error('Error creating Stripe session:', err);
          setError('Failed to initiate payment. Please try again.');
          return;
        }
      }
      
      // For free plan, simply complete the onboarding
      if (onComplete) {
        onComplete(selectedPlan);
      }
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError(`Failed to save your subscription: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      // Redirect to Stripe payment
      window.location.href = `/payment?plan=${plan}`;
    } catch (error) {
      console.error('Error initiating payment:', error);
    }
  };

  return (
    <div className="plan-selection-container">
      <div className="plan-selection">
        <h2 className="plan-selection-title">Choose Your Plan</h2>
        <p className="plan-selection-subtitle">Select the plan that works best for you</p>
        
        {error && <div className="plan-selection-error">{error}</div>}
        
        <div className="plans-grid">
          <div 
            className={`plan-card ${selectedPlan === 'free' ? 'selected' : ''}`}
            onClick={() => handlePlanSelect('free')}
          >
            <div className="plan-header">
              <h3 className="plan-name">Free</h3>
              <div className="plan-price">
                <span className="price">$0</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="plan-features">
              <li>Text summarization of highlighted text</li>
              <li>Up to 5 summaries/day</li>
              <li>Popup display for easy viewing</li>
              <li>Copy to clipboard</li>
            </ul>
            <div className="plan-selected-indicator">
              <div className="checkmark"></div>
            </div>
          </div>
          
          <div 
            className={`plan-card ${selectedPlan === 'pro' ? 'selected' : ''}`}
            onClick={() => handlePlanSelect('pro')}
          >
            <div className="plan-badge">BEST VALUE</div>
            <div className="plan-header">
              <h3 className="plan-name">Pro</h3>
              <div className="plan-price">
                <span className="price">$5</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="plan-features">
              <li>Up to 30 summaries/day</li>
              <li>Summary history</li>
              <li>Adjustable lengths</li>
              <li>Tone, style, & difficulty options</li>
              <li>Priority support</li>
            </ul>
            <div className="plan-selected-indicator">
              <div className="checkmark"></div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          className="plan-continue-btn"
          disabled={isLoading}
        >
          {isLoading 
            ? 'Processing...' 
            : selectedPlan === 'free' 
              ? 'Continue with Free Plan' 
              : 'Continue to Payment'}
        </button>
      </div>
    </div>
  );
};

export default PlanSelection; 