import React, { useState, useEffect, useRef } from 'react';
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const cardElementRef = useRef(null);
  const stripeRef = useRef(null);
  
  // Stripe price ID for the Pro plan
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID;

  // Define these before they're used in useEffect
  const isFreePlan = subscription?.plan_type === 'free';
  const isProPlan = subscription?.plan_type === 'pro';

  useEffect(() => {
    // Initialize Stripe
    const initStripe = async () => {
      const { loadStripe } = await import('@stripe/stripe-js');
      stripeRef.current = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    };
    initStripe();
  }, []);

  useEffect(() => {
    if (showAddPaymentMethod && stripeRef.current && !cardElementRef.current) {
      const elements = stripeRef.current.elements();
      const cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });
      cardElement.mount('#card-element');
      cardElementRef.current = cardElement;
    }
  }, [showAddPaymentMethod]);

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

  useEffect(() => {
    if (user && subscription?.plan_type === 'pro') {
      fetchPaymentMethods();
    }
  }, [user, subscription]);

  const fetchPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-methods?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.payment_methods);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setMessage({ 
        text: 'Failed to load payment methods. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

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

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const data = await response.json();
      setSubscription(data);
      setMessage({ 
        text: 'Your subscription has been cancelled. You will retain access to Pro features until the end of your billing period.', 
        type: 'success' 
      });
      setShowCancelDialog(false);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setMessage({ 
        text: 'Failed to cancel subscription. Please try again.', 
        type: 'error' 
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleAddPaymentMethod = async (event) => {
    event.preventDefault();
    
    if (!stripeRef.current || !cardElementRef.current) {
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create a payment method using Stripe Elements
      const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
        type: 'card',
        card: cardElementRef.current,
      });

      if (error) {
        throw error;
      }

      // Update the payment method on the backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ 
          email: user.email,
          payment_method_id: paymentMethod.id 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment method');
      }

      setMessage({ 
        text: 'Payment method added successfully!', 
        type: 'success' 
      });
      setShowAddPaymentMethod(false);
      fetchPaymentMethods();
    } catch (err) {
      console.error('Error adding payment method:', err);
      setMessage({ 
        text: err.message || 'Failed to add payment method. Please try again.', 
        type: 'error' 
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      setMessage({ 
        text: 'Default payment method updated successfully!', 
        type: 'success' 
      });
      fetchPaymentMethods();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setMessage({ 
        text: 'Failed to update default payment method. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment method');
      }

      setMessage({ 
        text: 'Payment method deleted successfully!', 
        type: 'success' 
      });
      fetchPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setMessage({ 
        text: err.message || 'Failed to delete payment method. Please try again.', 
        type: 'error' 
      });
    }
  };

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
          {/*
          <div className="plan-cards-figma">
            <div className={`plan-card-figma${isFreePlan ? ' active' : ''}`}> 
              <div className="plan-card-header">Free</div>
              <div className="plan-card-price-row">
                <span className="plan-card-price">$0</span>
                <span className="plan-card-period">/month</span>
              </div>
              <ul className="plan-card-features">
                <li><span className="plan-check">✔</span> Summarization of highlighted text</li>
                <li><span className="plan-check">✔</span> Up to 5 summaries/day</li>
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
                <li><span className="plan-check">✔</span> Up to 30 summaries/day</li>
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
          */}

          {/* New Subscription Management Section */}
          <div className="subscription-management-section">
            <h2 className="section-title">Manage Your Subscription</h2>
            
            {isProPlan && (
              <div className="subscription-info-card">
                <h3>Current Subscription Details</h3>
                <p>You are currently on the Pro plan, billed monthly at $5.00.</p>
                <p>Your subscription will automatically renew each month unless cancelled.</p>
                
                <div className="payment-methods-section">
                  <h4>Payment Methods</h4>
                  {loadingPaymentMethods ? (
                    <div className="loading">Loading payment methods...</div>
                  ) : (
                    <>
                      {paymentMethods.length > 0 ? (
                        <div className="payment-methods-list">
                          {paymentMethods.map((method) => (
                            <div key={method.id} className="payment-method-card">
                              <div className="card-details">
                                <span className="card-brand">{method.card.brand}</span>
                                <span className="card-last4">•••• {method.card.last4}</span>
                                <span className="card-expiry">
                                  Expires {method.card.exp_month}/{method.card.exp_year}
                                </span>
                              </div>
                              <div className="card-actions">
                                {method.id === subscription.default_payment_method ? (
                                  <span className="default-badge">Default</span>
                                ) : (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                  >
                                    Make Default
                                  </button>
                                )}
                                {method.id !== subscription.default_payment_method && (
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeletePaymentMethod(method.id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No payment methods found.</p>
                      )}
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setShowAddPaymentMethod(true)}
                      >
                        Add Payment Method
                      </button>
                    </>
                  )}
                </div>

                <div className="subscription-actions">
                  <button 
                    className="btn btn-danger"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancel Subscription
                  </button>
                </div>

                <div className="cancellation-info">
                  <h4>About Cancellation</h4>
                  <p>When you cancel your subscription:</p>
                  <ul>
                    <li>You'll continue to have access to Pro features until the end of your current billing period</li>
                    <li>You won't be charged again</li>
                    <li>You can resubscribe at any time</li>
                  </ul>
                </div>
              </div>
            )}

            {isFreePlan && (
              <div className="subscription-info-card">
                <h3>Free Plan Details</h3>
                <p>You are currently on the Free plan.</p>
                <p>Upgrade to Pro to unlock 30 summaries per day and advanced features!</p>
              </div>
            )}

            <div className="subscription-faq">
              <h3>Frequently Asked Questions</h3>
              <div className="faq-item">
                <h4>How do I manage my payment methods?</h4>
                <p>You can add, remove, or set default payment methods directly from this page. Click "Add Payment Method" to add a new card, or use the "Make Default" and "Delete" buttons to manage existing cards. Your default payment method will be used for all future charges.</p>
              </div>
              <div className="faq-item">
                <h4>What happens when I cancel my subscription?</h4>
                <p>When you cancel your Pro subscription, you'll maintain access to all Pro features until the end of your current billing period. After that, you'll automatically be switched to the Free plan, which includes 5 summaries per day and basic features.</p>
              </div>
              <div className="faq-item">
                <h4>Can I change my subscription plan?</h4>
                <p>Yes! You can upgrade to Pro at any time to get 30 summaries per day and advanced features. If you're on the Pro plan, you can downgrade to Free at any time, and your Pro features will remain active until the end of your current billing period.</p>
              </div>
              <div className="faq-item">
                <h4>How secure is my payment information?</h4>
                <p>We use Stripe, a PCI Service Provider Level 1 certified payment processor, to handle all payment information. Your card details are never stored on our servers. Stripe uses industry-standard encryption and security measures to protect your payment information.</p>
              </div>
              <div className="faq-item">
                <h4>What payment methods do you accept?</h4>
                <p>We accept all major credit and debit cards, including Visa, Mastercard, American Express, and Discover. All payments are processed securely through Stripe.</p>
              </div>
            </div>
          </div>

          {/* Add Payment Method Dialog */}
          {showAddPaymentMethod && (
            <div className="dialog-overlay">
              <div className="dialog">
                <h3>Add Payment Method</h3>
                <form onSubmit={handleAddPaymentMethod} className="payment-form">
                  <div className="form-group">
                    <label>Card Details</label>
                    <div id="card-element"></div>
                  </div>
                  <div className="dialog-actions">
                    <button 
                      type="button" 
                      onClick={() => setShowAddPaymentMethod(false)}
                      disabled={processingPayment}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="confirm"
                      disabled={!stripeRef.current || processingPayment}
                    >
                      {processingPayment ? 'Adding...' : 'Add Payment Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cancel Subscription Dialog */}
          {showCancelDialog && (
            <div className="dialog-overlay">
              <div className="dialog">
                <h3>Cancel Subscription</h3>
                <p>Are you sure you want to cancel your Pro subscription?</p>
                <ul>
                  <li>You'll continue to have access to Pro features until the end of your current billing period</li>
                  <li>You won't be charged again</li>
                  <li>You can resubscribe at any time</li>
                </ul>
                <div className="dialog-actions">
                  <button 
                    type="button"
                    onClick={() => setShowCancelDialog(false)}
                    disabled={cancelling}
                  >
                    Keep Subscription
                  </button>
                  <button 
                    type="button"
                    className="confirm"
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel Subscription'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Billing; 