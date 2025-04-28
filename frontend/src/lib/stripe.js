import { loadStripe } from '@stripe/stripe-js';

// Define the API URL - use environment variable if available
const API_URL = import.meta.env.VITE_API_URL || 'https://lightread-backend-636fc1215e35.herokuapp.com';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create a checkout session for subscription
export const createCheckoutSession = async (priceId) => {
  try {
    // Get the user email from localStorage or use an empty string
    const userEmail = localStorage.getItem('userEmail') || '';
    
    // Create the checkout session
    const response = await fetch(`${API_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include the email as part of the request body instead of headers
      },
      credentials: 'include', // Include cookies if needed
      body: JSON.stringify({ 
        priceId,
        email: userEmail // Move email to the request body
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    
    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
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
    
    const response = await fetch(`${API_URL}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include the email as part of the request body instead of headers
      },
      credentials: 'include', // Include cookies if needed
      body: JSON.stringify({ 
        email: userEmail // Move email to the request body
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
};

// Verify a checkout session
export const verifyCheckoutSession = async (sessionId) => {
  try {
    const response = await fetch(`${API_URL}/api/verify-session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    throw error;
  }
}; 