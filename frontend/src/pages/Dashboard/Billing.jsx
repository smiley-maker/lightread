import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSubscription, updateUserSubscription } from '../../lib/supabase';
import { createCheckoutSession, createBillingPortalSession } from '../../lib/stripe';
import './Billing.css';

const Billing = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Stripe price ID for the Pro plan
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID;

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await getUserSubscription(user.id);
        
        if (error) {
          throw error;
        }
        
        setSubscription(data || { plan_type: 'free', status: 'active' });
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setSubscription({ plan_type: 'free', status: 'active' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user]);

  const handlePlanChange = async (planType) => {
    if (!user || updating || (subscription && subscription.plan_type === planType)) return;
    
    try {
      setUpdating(true);
      
      if (planType === 'pro') {
        // For upgrading to pro, use the checkout session
        localStorage.setItem('userEmail', user.email);
        try {
          await createCheckoutSession(STRIPE_PRICE_ID);
          return; // Exit early as we're redirecting
        } catch (err) {
          console.error('Error creating checkout session:', err);
          setMessage({ 
            text: 'Failed to initiate payment. Please try again.', 
            type: 'error' 
          });
          return;
        }
      }
      
      // For downgrading to free plan
      const { data, error } = await updateUserSubscription(user.id, planType);
      
      if (error) {
        console.error('Error updating subscription:', error);
        throw error;
      }
      
      setSubscription(data);
      setMessage({ 
        text: `Successfully switched to ${planType} plan!`, 
        type: 'success' 
      });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Error updating subscription:', err);
      setMessage({ 
        text: `Failed to update subscription. Please try again.`, 
        type: 'error' 
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      if (!user || !user.email) {
        throw new Error('User information is missing');
      }
      
      localStorage.setItem('userEmail', user.email);
      const { url } = await createBillingPortalSession();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to get billing portal URL');
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setMessage({ 
        text: 'Failed to open billing portal. Please try again.', 
        type: 'error' 
      });
    }
  };

  const isFreePlan = subscription?.plan_type === 'free';
  const isProPlan = subscription?.plan_type === 'pro';

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Modify Plan Selection</h1>
      
      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your subscription...</p>
        </div>
      ) : (
        <>
          <div className="plan-cards-figma">
            <div className={`plan-card-figma${isFreePlan ? ' active' : ''}`}> 
              <div className="plan-card-header">Free</div>
              <div className="plan-card-price-row">
                <span className="plan-card-price">$0</span>
                <span className="plan-card-period">/month</span>
              </div>
              <ul className="plan-card-features">
                <li><span className="plan-check">✔</span> Summarization of highlighted text</li>
                <li><span className="plan-check">✔</span> Up to 10 summaries/day</li>
                <li><span className="plan-check">✔</span> Popup display for easy viewing</li>
                <li><span className="plan-check">✔</span> Copy to clipboard</li>
              </ul>
              <button 
                className={`plan-card-btn${isFreePlan ? ' selected' : ''}`}
                onClick={() => handlePlanChange('free')}
                disabled={updating || isFreePlan}
              >
                {isFreePlan ? 'selected' : 'select plan'}
              </button>
            </div>
            <div className={`plan-card-figma pro${isProPlan ? ' active' : ''}`}> 
              <div className="plan-card-header pro">Pro</div>
              <div className="plan-card-price-row">
                <span className="plan-card-price">$5</span>
                <span className="plan-card-period">/month</span>
              </div>
              <ul className="plan-card-features">
                <li><span className="plan-check">✔</span> Unlimited summaries</li>
                <li><span className="plan-check">✔</span> Summary history</li>
                <li><span className="plan-check">✔</span> Adjustable lengths</li>
                <li><span className="plan-check">✔</span> Tone, style, & difficulty options</li>
              </ul>
              <button 
                className={`plan-card-btn${isProPlan ? ' selected' : ''}`}
                onClick={() => handlePlanChange('pro')}
                disabled={updating || isProPlan}
              >
                {isProPlan ? 'selected' : 'select plan'}
              </button>
            </div>
          </div>

          {/* New Subscription Management Section */}
          <div className="subscription-management-section">
            <h2 className="section-title">Manage Your Subscription</h2>
            
            {isProPlan && (
              <div className="subscription-info-card">
                <h3>Current Subscription Details</h3>
                <p>You are currently on the Pro plan, billed monthly at $5.00.</p>
                <p>Your subscription will automatically renew each month unless cancelled.</p>
                
                <div className="subscription-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleManageSubscription}
                  >
                    Manage Subscription
                  </button>
                </div>

                <div className="cancellation-info">
                  <h4>How to Cancel Your Subscription</h4>
                  <ol>
                    <li>Click the "Manage Subscription" button above</li>
                    <li>You'll be redirected to our secure billing portal</li>
                    <li>Select "Cancel Subscription"</li>
                    <li>Choose whether to cancel immediately or at the end of your billing period</li>
                  </ol>
                  <p className="note">
                    Note: When you cancel, you'll continue to have access to Pro features until the end of your current billing period. 
                    After that, you'll be automatically switched to the Free plan.
                  </p>
                </div>
              </div>
            )}

            {isFreePlan && (
              <div className="subscription-info-card">
                <h3>Free Plan Details</h3>
                <p>You are currently on the Free plan.</p>
                <p>Upgrade to Pro to unlock unlimited summaries and advanced features!</p>
              </div>
            )}

            <div className="subscription-faq">
              <h3>Frequently Asked Questions</h3>
              <div className="faq-item">
                <h4>What happens when I cancel?</h4>
                <p>When you cancel your Pro subscription, you'll continue to have access to Pro features until the end of your current billing period. After that, you'll be automatically switched to the Free plan.</p>
              </div>
              <div className="faq-item">
                <h4>Can I get a refund?</h4>
                <p>We don't offer refunds for partial subscription periods. However, you can cancel at any time to prevent future charges.</p>
              </div>
              <div className="faq-item">
                <h4>How do I update my payment method?</h4>
                <p>You can update your payment method through the billing portal. Click the "Manage Subscription" button above to access it.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Billing; 