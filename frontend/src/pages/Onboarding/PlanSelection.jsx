import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSubscription, updateUserSubscription } from '../../lib/supabase';
import { createCheckoutSession } from '../../lib/stripe';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import './Onboarding.css';

const PlanSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Stripe price ID for the Pro plan
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID;

  const handleBack = () => {
    navigate('/onboarding/welcome');
  };

  const handlePlanSelect = (planType) => {
    setSelectedPlan(planType);
  };

  const handleNext = async () => {
    if (!user || loading) return;
    
    try {
      setLoading(true);
      
      if (selectedPlan === 'pro') {
        // If pro plan is selected, redirect to Stripe checkout
        try {
          // Store the user email locally so it can be sent with the API request
          localStorage.setItem('userEmail', user.email || '');
          // Redirect to checkout with onboarding success URL
          await createCheckoutSession(STRIPE_PRICE_ID, '/onboarding/stripe-success');
          return; // Don't call onComplete as we're redirecting to Stripe
        } catch (err) {
          console.error('Error creating Stripe session:', err);
          setMessage({ 
            text: 'Failed to initiate payment. Please try again.', 
            type: 'error' 
          });
          return;
        }
      }
      
      // For free plan, update subscription and continue
      const { data, error } = await updateUserSubscription(user.id, 'free');
      
      if (error) {
        console.error('Error updating subscription:', error);
        throw error;
      }
      
      // Continue to next step
      navigate('/onboarding/how-it-works');
      
    } catch (err) {
      console.error('Error selecting plan:', err);
      setMessage({ 
        text: 'Failed to select plan. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>Choose Your Plan</h1>
          <p>Select the plan that best fits your summarization needs.</p>
        </div>

        {message.text && (
          <div className={`onboarding-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="plan-selection-grid">
          <div 
            className={`plan-card ${selectedPlan === 'free' ? 'selected' : ''}`}
            onClick={() => handlePlanSelect('free')}
          >
            <div className="plan-header">
              <h3>Free</h3>
              <div className="plan-price">
                <span className="price">$0</span>
                <span className="period">/month</span>
              </div>
            </div>
            
            <ul className="plan-features">
              <li><Check size={16} /> Up to 5 summaries per day</li>
              <li><Check size={16} /> Text summarization</li>
              <li><Check size={16} /> Copy to clipboard</li>
              <li><Check size={16} /> Basic length options</li>
              <li><Check size={16} /> Summary history</li>
            </ul>
            
            <div className="plan-select-indicator">
              {selectedPlan === 'free' && <Check size={20} />}
            </div>
          </div>

          <div 
            className={`plan-card pro ${selectedPlan === 'pro' ? 'selected' : ''}`}
            onClick={() => handlePlanSelect('pro')}
          >
            <div className="plan-header">
              <h3>Pro</h3>
              <div className="plan-price">
                <span className="price">$5</span>
                <span className="period">/month</span>
              </div>
            </div>
            
            <ul className="plan-features">
              <li><Check size={16} /> Up to 30 summaries per day</li>
              <li><Check size={16} /> Advanced tone controls</li>
              <li><Check size={16} /> Difficulty level options</li>
              <li><Check size={16} /> Regenerate summaries</li>
              <li><Check size={16} /> Priority support</li>
            </ul>
            
            <div className="plan-select-indicator">
              {selectedPlan === 'pro' && <Check size={20} />}
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="btn btn-secondary" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Processing...' : selectedPlan === 'pro' ? 'Continue to Payment' : 'Continue'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection; 