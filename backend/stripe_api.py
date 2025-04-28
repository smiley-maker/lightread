from flask import Blueprint, request, jsonify
import stripe
from datetime import datetime, timedelta
from config import (
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET
)
from supabase import create_client
import os

stripe_api = Blueprint('stripe_api', __name__)
stripe.api_key = STRIPE_SECRET_KEY

# Initialize Supabase client
supabase = create_client(
    supabase_url=os.environ.get('SUPABASE_URL'),
    supabase_key=os.environ.get('SUPABASE_KEY')
)

@stripe_api.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.get_json()
        price_id = data.get('priceId')
        customer_email = data.get('email')
        
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
            success_url='https://lightread.xyz/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://lightread.xyz/dashboard',
            customer_email=customer_email,
        )
        
        return jsonify({'sessionId': session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_api.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    try:
        # Get the customer email from the request body
        data = request.get_json()
        customer_email = data.get('email')
        
        if not customer_email:
            return jsonify({'error': 'Email is required'}), 400
            
        customers = stripe.Customer.list(email=customer_email)
        
        if not customers.data:
            return jsonify({'error': 'Customer not found'}), 404
            
        customer = customers.data[0]
        
        # Create billing portal session
        session = stripe.billing_portal.Session.create(
            customer=customer.id,
            return_url='https://lightread.xyz/dashboard',
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
    
    # Find the user by email in the users table
    user_response = supabase.table('users').select('id').eq('email', user_email).execute()
    if not user_response.data or len(user_response.data) == 0:
        # Log error if user not found
        print(f"Error: User with email {user_email} not found in the database")
        return
    
    user_id = user_response.data[0]['id']
    
    # Check if user already has a subscription
    existing_sub = supabase.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
    
    if existing_sub.data and len(existing_sub.data) > 0:
        # Update existing subscription
        supabase.table('subscriptions').update({
            'plan_type': 'pro',
            'status': 'active',
            'start_date': datetime.utcnow().isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=30)).isoformat(),
            'stripe_customer_id': session.customer,
            'stripe_subscription_id': session.subscription
        }).eq('user_id', user_id).eq('status', 'active').execute()
    else:
        # Create new subscription
        supabase.table('subscriptions').insert({
            'user_id': user_id,
            'plan_type': 'pro',
            'status': 'active',
            'start_date': datetime.utcnow().isoformat(),
            'end_date': (datetime.utcnow() + timedelta(days=30)).isoformat(),
            'stripe_customer_id': session.customer,
            'stripe_subscription_id': session.subscription,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).execute()

def handle_subscription_updated(subscription):
    # Update subscription status in database
    customer = stripe.Customer.retrieve(subscription.customer)
    user_email = customer.email
    
    # Find the user by email in the users table
    user_response = supabase.table('users').select('id').eq('email', user_email).execute()
    if not user_response.data or len(user_response.data) == 0:
        # Log error if user not found
        print(f"Error: User with email {user_email} not found in the database")
        return
    
    user_id = user_response.data[0]['id']
    
    # Update subscription in Supabase
    supabase.table('subscriptions').update({
        'status': subscription.status,
        'end_date': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute()

def handle_subscription_deleted(subscription):
    # Update subscription status to cancelled
    customer = stripe.Customer.retrieve(subscription.customer)
    user_email = customer.email
    
    # Find the user by email in the users table
    user_response = supabase.table('users').select('id').eq('email', user_email).execute()
    if not user_response.data or len(user_response.data) == 0:
        # Log error if user not found
        print(f"Error: User with email {user_email} not found in the database")
        return
    
    user_id = user_response.data[0]['id']
    
    # Update subscription in Supabase
    supabase.table('subscriptions').update({
        'status': 'cancelled',
        'plan_type': 'free',
        'cancelled_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute() 