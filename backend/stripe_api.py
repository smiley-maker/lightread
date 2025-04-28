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
            success_url='https://www.lightread.xyz/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://www.lightread.xyz/dashboard',
            customer_email=customer_email,
        )
        
        return jsonify({'sessionId': session.id})
    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
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
            return_url='https://www.lightread.xyz/dashboard',
        )
        
        return jsonify({'url': session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_api.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    print(f"Received webhook with signature: {sig_header[:10]}...")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        print(f"Webhook event constructed successfully: {event.type}")
    except ValueError as e:
        print(f"Invalid payload error: {str(e)}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature error: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
        
    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object
        print(f"Processing checkout.session.completed: {session.id}")
        handle_checkout_session_completed(session)
    elif event.type == 'customer.subscription.updated':
        subscription = event.data.object
        print(f"Processing customer.subscription.updated: {subscription.id}")
        handle_subscription_updated(subscription)
    elif event.type == 'customer.subscription.deleted':
        subscription = event.data.object
        print(f"Processing customer.subscription.deleted: {subscription.id}")
        handle_subscription_deleted(subscription)
    else:
        print(f"Unhandled event type: {event.type}")
        
    return jsonify({'status': 'success'})

@stripe_api.route('/verify-session/<session_id>', methods=['GET'])
def verify_session(session_id):
    try:
        print(f"Verifying session with ID: {session_id}")
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        if not session:
            print("Session not found in Stripe")
            return jsonify({'error': 'Session not found'}), 404
        
        print(f"Found session with status: {session.status}, payment_status: {session.payment_status}")
        print(f"Full session data: {session}")
            
        # Check if the payment was successful
        if session.payment_status == 'paid':
            print("Payment was successful, processing the completed checkout session")
            # Process the successful payment
            handle_checkout_session_completed(session)
            return jsonify({
                'success': True, 
                'status': session.status, 
                'payment_status': session.payment_status,
                'customer_email': session.customer_details.email if hasattr(session, 'customer_details') and hasattr(session.customer_details, 'email') else None
            })
        else:
            print(f"Payment not successful: {session.payment_status}")
            return jsonify({
                'success': False, 
                'status': session.status, 
                'payment_status': session.payment_status
            })
    except Exception as e:
        print(f"Error verifying session: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def handle_checkout_session_completed(session):
    try:
        print(f"Starting handle_checkout_session_completed for session: {session.id}")
        # Update user's subscription in database
        customer = stripe.Customer.retrieve(session.customer)
        user_email = customer.email
        
        print(f"Retrieved customer: {customer.id} with email: {user_email}")
        
        # Find the user by email in the auth.users table
        # First try the auth.users table (where Supabase actually stores users)
        user_response = supabase.from_('auth.users').select('id').eq('email', user_email).execute()
        print(f"Supabase auth.users query response: {user_response}")
        
        # If that fails, try the users table
        if not user_response.data or len(user_response.data) == 0:
            user_response = supabase.from_('users').select('id').eq('email', user_email).execute()
            print(f"Supabase users table query response: {user_response}")
            
            # If still no user found, try a raw query to see which table has user data
            if not user_response.data or len(user_response.data) == 0:
                # Try a direct auth query
                auth_response = supabase.auth.admin.list_users()
                print(f"Auth users list response: {auth_response}")
                
                # Find the user with matching email
                matching_users = [u for u in auth_response.users if u.email == user_email]
                if matching_users:
                    user_id = matching_users[0].id
                    print(f"Found user with ID: {user_id} in auth users list")
                else:
                    print(f"Error: User with email {user_email} not found in any database table")
                    return
        
        if not user_response.data or len(user_response.data) == 0:
            # Get user ID from the matching users we found in auth.admin.list_users
            if 'user_id' not in locals():
                print(f"Error: User with email {user_email} not found in the database")
                return
        else:
            user_id = user_response.data[0]['id']
            print(f"Found user with ID: {user_id}")
        
        # Check if user already has a subscription
        existing_sub = supabase.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
        print(f"Existing subscription query response: {existing_sub}")
        
        # Include full session details in logs
        print(f"Full session data: {session}")
        
        if existing_sub.data and len(existing_sub.data) > 0:
            # Update existing subscription
            print(f"Updating existing subscription for user: {user_id}")
            update_response = supabase.table('subscriptions').update({
                'plan_type': 'pro',
                'status': 'active',
                'start_date': datetime.utcnow().isoformat(),
                'end_date': (datetime.utcnow() + timedelta(days=30)).isoformat(),
                'stripe_customer_id': session.customer,
                'stripe_subscription_id': session.subscription,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('user_id', user_id).eq('status', 'active').execute()
            print(f"Update response: {update_response}")
        else:
            # Create new subscription
            print(f"Creating new subscription for user: {user_id}")
            insert_response = supabase.table('subscriptions').insert({
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
            print(f"Insert response: {insert_response}")
        
        print(f"Successfully processed checkout session: {session.id}")
    except Exception as e:
        print(f"Error in handle_checkout_session_completed: {str(e)}")
        import traceback
        traceback.print_exc()

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