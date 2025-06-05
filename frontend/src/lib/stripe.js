import { loadStripe } from '@stripe/stripe-js';

// Define the API URL - use environment variable if available
const API_URL = import.meta.env.VITE_API_URL || 'https://lightread-backend.herokuapp.com';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create a checkout session for subscription
export const createCheckoutSession = async (priceId) => {
  try {
    // Get the user email from localStorage or use an empty string
    const userEmail = localStorage.getItem('userEmail') || '';
    
    console.log(`Creating checkout session for price ID: ${priceId} and email: ${userEmail}`);
    console.log(`Using API URL: ${API_URL}`);
    
    // Create the checkout session
    const response = await fetch(`${API_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({ 
        email: userEmail,
        priceId: priceId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Error response from server: ${errorText}`);
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    const session = await response.json();
    console.log('Checkout session created:', session);
    
    // Load Stripe and redirect to checkout
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }
    
    // This will redirect to Stripe's checkout page
    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (result.error) {
      console.error('Stripe redirect error:', result.error);
      throw new Error(result.error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create a billing portal session
export const createBillingPortalSession = async () => {
  try {
    // Get the user email from localStorage or use an empty string
    const userEmail = localStorage.getItem('userEmail') || '';
    
    console.log(`Creating billing portal session for email: ${userEmail}`);
    console.log(`Using API URL: ${API_URL}`);
    
    const response = await fetch(`${API_URL}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({ 
        email: userEmail
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text available');
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Unknown error' };
      }
      
      console.error('Billing portal error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      throw new Error(errorData.error || `Server responded with ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Billing portal session created:', responseData);
    
    const { url } = responseData;
    console.log(`Redirecting to billing portal at: ${url}`);
    window.location.href = url;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
};

// Verify a checkout session
export const verifyCheckoutSession = async (sessionId) => {
  try {
    console.log(`Verifying checkout session with ID: ${sessionId}`);
    console.log(`Using API URL: ${API_URL}`);
    
    const response = await fetch(`${API_URL}/api/verify-session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text available');
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Unknown error' };
      }
      
      console.error('Session verification error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      throw new Error(errorData.error || `Server responded with ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Session verification result:', responseData);
    
    // Add additional logging for debugging
    if (responseData.success) {
      console.log('Session verification successful');
      console.log('Customer email:', responseData.customer_email);
      console.log('Subscription ID:', responseData.subscription_id);
    } else {
      console.log('Session verification failed');
      console.log('Status:', responseData.status);
      console.log('Message:', responseData.message);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    throw error;
  }
}; 