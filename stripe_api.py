from flask import Blueprint, request, jsonify
import stripe
from datetime import datetime, timedelta
from config import (
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET
)

stripe_api = Blueprint('stripe_api', __name__)
stripe.api_key = STRIPE_SECRET_KEY

@stripe_api.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.get_json()
        price_id = data.get('priceId')
        
        if not price_id:
            return jsonify({'error': 'Price ID is required'}), 400
            
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='http://localhost:5173/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://localhost:5173/dashboard',
            customer_email=request.headers.get('X-User-Email'),
        )
        
        return jsonify({'sessionId': session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_api.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    try:
        # Get the customer ID from the subscription
        customer_email = request.headers.get('X-User-Email')
        customers = stripe.Customer.list(email=customer_email)
        
        if not customers.data:
            return jsonify({'error': 'Customer not found'}), 404
            
        customer = customers.data[0]
        
        # Create billing portal session
        session = stripe.billing_portal.Session.create(
            customer=customer.id,
            return_url='http://localhost:5173/dashboard',
        )
        
        return jsonify({'url': session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_api.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400
        
    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object
        handle_checkout_session_completed(session)
    elif event.type == 'customer.subscription.updated':
        subscription = event.data.object
        handle_subscription_updated(subscription)
    elif event.type == 'customer.subscription.deleted':
        subscription = event.data.object
        handle_subscription_deleted(subscription)
        
    return jsonify({'status': 'success'})

def handle_checkout_session_completed(session):
    # Update user's subscription in database
    customer = stripe.Customer.retrieve(session.customer)
    user_email = customer.email
    
    # Update subscription in Supabase
    supabase.table('subscriptions').update({
        'plan_type': 'pro',
        'status': 'active',
        'start_date': datetime.utcnow().isoformat(),
        'end_date': (datetime.utcnow() + timedelta(days=30)).isoformat(),
        'stripe_customer_id': session.customer,
        'stripe_subscription_id': session.subscription
    }).eq('user_email', user_email).execute()

def handle_subscription_updated(subscription):
    # Update subscription status in database
    customer = stripe.Customer.retrieve(subscription.customer)
    user_email = customer.email
    
    # Update subscription in Supabase
    supabase.table('subscriptions').update({
        'status': subscription.status,
        'end_date': datetime.fromtimestamp(subscription.current_period_end).isoformat()
    }).eq('user_email', user_email).execute()

def handle_subscription_deleted(subscription):
    # Update subscription status to cancelled
    customer = stripe.Customer.retrieve(subscription.customer)
    user_email = customer.email
    
    # Update subscription in Supabase
    supabase.table('subscriptions').update({
        'status': 'cancelled',
        'plan_type': 'free',
        'cancelled_at': datetime.utcnow().isoformat()
    }).eq('user_email', user_email).execute() 