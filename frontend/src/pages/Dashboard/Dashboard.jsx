import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSubscription } from '../../lib/supabase';
import { verifyCheckoutSession } from '../../lib/stripe';
import '../../components/Dashboard/Dashboard.css';
import Billing from './Billing';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    lastWeek: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionUpdated, setSubscriptionUpdated] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  // Parse the tab parameter from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    
    if (tabParam && ['dashboard', 'billing', 'settings', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Function to change tabs and update URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  };

  // Function to manually refresh subscription status
  const refreshSubscriptionStatus = async () => {
    if (!user) return;
    
    try {
      setSubscriptionMessage('Checking subscription status...');
      const { data, error } = await getUserSubscription(user.id);
      
      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionMessage('Failed to check subscription. Please try again.');
      } else if (data) {
        setSubscriptionStatus(data);
        setSubscriptionMessage(`Your current plan is: ${data.plan_type.toUpperCase()}`);
        
        if (data.stripe_customer_id) {
          setSubscriptionMessage(prev => `${prev} (Stripe customer ID: ${data.stripe_customer_id.substring(0, 10)}...)`);
        }
      } else {
        setSubscriptionMessage('No subscription found.');
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscriptionMessage('An error occurred. Please try again.');
    }
  };

  // Check for Stripe session_id in URL query params
  useEffect(() => {
    const checkStripeSession = async () => {
      const queryParams = new URLSearchParams(location.search);
      const sessionId = queryParams.get('session_id');
      
      if (sessionId && user) {
        try {
          console.log('Stripe checkout completed with session ID:', sessionId);
          
          // Set the active tab to 'billing' to show subscription details
          setActiveTab('billing');
          
          // Display a temporary message
          setSubscriptionMessage('Verifying payment...');
          
          // First try to manually verify the session
          try {
            const result = await verifyCheckoutSession(sessionId);
            console.log('Verification result:', result);
            
            if (result.success) {
              console.log('Payment verified successfully');
              setSubscriptionMessage('Payment successful! Updating your subscription...');
              
              // Force a delay to allow the server time to process the webhook
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Fetch the latest subscription data
              try {
                const { data, error } = await getUserSubscription(user.id);
                
                console.log('Refreshed subscription data:', data);
                
                if (error) {
                  console.error('Error fetching subscription after payment:', error);
                  setSubscriptionMessage('Payment successful, but there was an error updating your subscription. Please refresh the page.');
                } else if (data) {
                  console.log('Subscription status after payment:', data);
                  setSubscriptionUpdated(true);
                  
                  if (data.plan_type === 'pro') {
                    setSubscriptionMessage('You are now a Pro user! Enjoy 30 summaries per day and more features.');
                  } else {
                    // Manual refresh if the plan type isn't updated yet
                    setSubscriptionMessage('Payment successful! Refreshing subscription status...');
                    
                    // Try one more time after a delay
                    setTimeout(async () => {
                      const { data: refreshedData } = await getUserSubscription(user.id);
                      if (refreshedData && refreshedData.plan_type === 'pro') {
                        setSubscriptionMessage('You are now a Pro user! Enjoy 30 summaries per day and more features.');
                      } else {
                        setSubscriptionMessage('Your payment was successful but your subscription might take a moment to update. Please refresh the page in a few minutes.');
                      }
                    }, 5000);
                  }
                }
              } catch (fetchError) {
                console.error('Error fetching subscription data:', fetchError);
                setSubscriptionMessage('Payment successful, but there was an error fetching your subscription details. Please refresh the page.');
              }
            } else {
              console.log('Payment verification returned:', result);
              setSubscriptionMessage('Payment verification pending. Your subscription will update shortly.');
            }
          } catch (verifyError) {
            console.error('Error verifying payment:', verifyError);
            setSubscriptionMessage('There was an issue verifying your payment. Please check your subscription status.');
          }
          
          // Clear the session_id from the URL to prevent reprocessing
          const newUrl = window.location.pathname + '?tab=billing';
          window.history.replaceState({}, document.title, newUrl);
        } catch (err) {
          console.error('Error processing checkout session:', err);
          setSubscriptionMessage('Error processing payment information. Please contact support if this persists.');
        }
      }
    };
    
    checkStripeSession();
  }, [location.search, user, navigate]);

  useEffect(() => {
    // In a real app, this would fetch summary statistics from an API
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Simulating API call with timeout
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data - replace with actual API call in production
        setSummaryStats({
          total: 14,
          lastWeek: 3,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, subscriptionUpdated]);

  // Render dashboard content or billing based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'billing':
        return <Billing />;
      case 'dashboard':
      default:
        return (
          <>
            {/* Subscription Status Section */}
            {subscriptionMessage && (
              <div className={`mb-4 p-4 rounded-lg border ${
                subscriptionMessage.includes('Failed') || subscriptionMessage.includes('error')
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : subscriptionMessage.includes('PRO')
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-blue-300 bg-blue-50 text-blue-700'
              }`}>
                <p>{subscriptionMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-medium text-gray-700 mb-1">Total Summaries</h3>
                <p className="text-3xl font-bold text-indigo-600">{summaryStats.total}</p>
                <p className="text-sm text-gray-500 mt-2">
                  All summaries you've created with LightRead
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-medium text-gray-700 mb-1">Recent Activity</h3>
                <p className="text-3xl font-bold text-indigo-600">{summaryStats.lastWeek}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Summaries created in the last 7 days
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
              <h2 className="dashboard-subtitle mb-4">Subscription</h2>
              <button 
                onClick={refreshSubscriptionStatus}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Check Subscription Status
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="dashboard-subtitle">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <a 
                  href="/upload" 
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
                >
                  <div className="p-3 bg-indigo-100 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Upload Document</h3>
                    <p className="text-sm text-gray-500">Upload a PDF or text document</p>
                  </div>
                </a>
                
                <a 
                  href="/paste" 
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
                >
                  <div className="p-3 bg-indigo-100 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Paste Text</h3>
                    <p className="text-sm text-gray-500">Paste text for summarization</p>
                  </div>
                </a>
              </div>
            </div>
          </>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Dashboard</h1>
      
      {/* Navigation Tabs */}
      <div className="dashboard-tabs mb-6">
        <button 
          onClick={() => handleTabChange('dashboard')}
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => handleTabChange('billing')}
          className={`tab-button ${activeTab === 'billing' ? 'active' : ''}`}
        >
          Billing
        </button>
        <button 
          onClick={() => handleTabChange('settings')}
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
        >
          Settings
        </button>
        <button 
          onClick={() => handleTabChange('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          History
        </button>
      </div>

      {renderContent()}
    </div>
  );
};

export default Dashboard; 