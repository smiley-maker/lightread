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
      mode: 'cors', // Explicitly set CORS mode
      credentials: 'include', // Include cookies if needed
      body: JSON.stringify({ 
        priceId,
        email: userEmail // Move email to the request body
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
      
      console.error('Checkout error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      throw new Error(errorData.error || `Server responded with ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Checkout session created:', responseData);
    
    const { sessionId } = responseData;
    const stripe = await stripePromise;
    
    // Redirect to Stripe Checkout
    console.log(`Redirecting to Stripe checkout with session ID: ${sessionId}`);
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      console.error('Stripe redirect error:', error);
      throw error;
    }
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
      mode: 'cors', // Explicitly set CORS mode
      credentials: 'include', // Include cookies if needed
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
      mode: 'cors', // Explicitly set CORS mode
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
    
    return responseData;
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    throw error;
  }
}; 