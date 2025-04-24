import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSubscription, updateUserSubscription } from '../../lib/supabase';
import './Billing.css';

const Billing = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
      const { data, error } = await updateUserSubscription(user.id, planType);
      
      if (error) {
        throw error;
      }
      
      setSubscription(data);
      setMessage({ 
        text: `Successfully ${planType === 'pro' ? 'upgraded to' : 'switched to'} ${planType} plan!`, 
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
        <div className="billing-container">
          <div className="plan-cards">
            <div className={`plan-card ${isFreePlan ? 'active' : ''}`}>
              <h2 className="plan-title">Free</h2>
              <div className="plan-price">
                <span className="price">$0</span>
                <span className="period">/month</span>
              </div>
              <ul className="plan-features">
                <li style={ isFreePlan ? {color: 'white'} : {color: 'black'} }>Summarization of highlighted text</li>
                <li style={ isFreePlan ? {color: 'white'} : {color: 'black'} }>Up to 10 summaries/day</li>
                <li style={ isFreePlan ? {color: 'white'} : {color: 'black'} }>Popup display for easy viewing</li>
                <li style={ isFreePlan ? {color: 'white'} : {color: 'black'} }>Copy to clipboard</li>
              </ul>
              <button 
                className={`plan-button ${isFreePlan ? 'active-plan' : 'select-plan'}`}
                onClick={() => handlePlanChange('free')}
                disabled={updating || isFreePlan}
              >
                {isFreePlan ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
            
            <div className={`plan-card pro ${isProPlan ? 'active' : ''}`}>
              <h2 className="plan-title">Pro</h2>
              <div className="plan-price">
                <span className="price">$5</span>
                <span className="period">/month</span>
              </div>
              <ul className="plan-features">
                <li style={ isProPlan ? {color: 'white'} : {color: 'black'} }>Unlimited summaries</li>
                <li style={ isProPlan ? {color: 'white'} : {color: 'black'} }>Summary history</li>
                <li style={ isProPlan ? {color: 'white'} : {color: 'black'} }>Adjustable lengths</li>
                <li style={ isProPlan ? {color: 'white'} : {color: 'black'} }>Tone, style, & difficulty options</li>
              </ul>
              <button 
                className={`plan-button ${isProPlan ? 'active-plan' : 'select-plan'}`}
                onClick={() => handlePlanChange('pro')}
                disabled={updating || isProPlan}
              >
                {isProPlan ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          </div>
          
          {isProPlan && subscription?.end_date && (
            <div className="payment-info">
              <h3>Payment Information</h3>
              <p>Your next payment of $5 will be processed on {new Date(subscription.end_date).toLocaleDateString()}</p>
              <button className="cancel-subscription" onClick={() => handlePlanChange('free')}>
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Billing; 