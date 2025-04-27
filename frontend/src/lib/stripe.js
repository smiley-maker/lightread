import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create a checkout session for subscription
export const createCheckoutSession = async (priceId) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
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
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create billing portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}; 