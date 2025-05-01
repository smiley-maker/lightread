from flask import Blueprint, request, jsonify
import stripe
from datetime import datetime, timedelta
import config
from config import (
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID
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
    """
    Create a Stripe checkout session for subscription.
    """
    try:
        data = request.json
        customer_email = data.get('email', '')
        price_id = STRIPE_PRICE_ID
        
        print(f"Creating checkout session for email: {customer_email} and price ID: {price_id}")
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='https://www.lightread.xyz/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://www.lightread.xyz/dashboard?tab=billing',
            customer_email=customer_email,
        )
        
        print(f"Created checkout session: {session.id} for {customer_email}")
        
        # Return the session ID for the frontend to use
        return jsonify({'id': session.id}), 200
    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        import traceback
        traceback.print_exc()
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
    """
    Handle Stripe webhook events
    """
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    # For debugging, log the request info
    print("==================== REQUEST INFO ====================")
    print(f"Request data: {payload.decode('utf-8')}")
    print(f"Signature header: {sig_header}")
    print("==================== END REQUEST INFO ====================")
    print(f"Received webhook with signature: {sig_header[:10]}...")
    
    try:
        # Construct the event using the payload and signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET
        )
        print(f"Webhook event constructed successfully: {event.type}")
        
        # Handle different event types
        if event.type == 'checkout.session.completed':
            session = event.data.object
            # Process the checkout session
            handle_checkout_session_completed(session)
        elif event.type == 'customer.subscription.updated':
            subscription = event.data.object
            # Update subscription status
            handle_subscription_updated(subscription)
        elif event.type == 'customer.subscription.deleted':
            subscription = event.data.object
            # Mark subscription as cancelled
            handle_subscription_deleted(subscription)
        elif event.type == 'invoice.paid':
            # Handle the invoice paid event
            invoice = event.data.object
            print(f"Processing invoice.paid event for invoice: {invoice.id}")
            
            # Get the subscription ID from the invoice
            if hasattr(invoice, 'subscription') and invoice.subscription:
                subscription_id = invoice.subscription
                # Retrieve the subscription
                try:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    print(f"Retrieved subscription: {subscription.id} for invoice: {invoice.id}")
                    # Update the subscription in our database
                    handle_subscription_updated(subscription)
                except Exception as sub_err:
                    print(f"Error retrieving subscription for invoice: {str(sub_err)}")
            else:
                print(f"No subscription associated with invoice {invoice.id}")
        else:
            print(f"Unhandled event type: {event.type}")
        
        return jsonify({'status': 'success'}), 200
    except ValueError as e:
        # Invalid payload
        print(f"Invalid payload: {str(e)}")
        return jsonify({'status': 'failure', 'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f"Invalid signature: {str(e)}")
        return jsonify({'status': 'failure', 'error': 'Invalid signature'}), 400
    except Exception as e:
        # Other error
        print(f"Webhook error: {str(e)}")
        return jsonify({'status': 'failure', 'error': str(e)}), 500

@stripe_api.route('/verify-session/<session_id>', methods=['GET'])
def verify_session(session_id):
    try:
        print(f"Verifying session with ID: {session_id}")
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(
            session_id,
            expand=['customer', 'line_items']
        )
        
        if not session:
            print("Session not found in Stripe")
            return jsonify({'error': 'Session not found'}), 404
        
        print(f"Found session with status: {session.status}, payment_status: {session.payment_status}")
        print(f"Full session data: {session}")
            
        # Check if the payment was successful
        if session.payment_status == 'paid':
            print("Payment was successful, processing the completed checkout session")
            # Process the successful checkout
            result = handle_checkout_session_completed(session)
            
            # If handle_checkout_session_completed returns a tuple, it's a response
            if isinstance(result, tuple):
                return result
            
            return jsonify({
                'success': True,
                'status': 'paid',
                'customer_email': session.customer.email if hasattr(session, 'customer') and session.customer else None,
                'subscription_id': session.subscription if hasattr(session, 'subscription') else None
            })
        elif session.payment_status == 'unpaid':
            print("Payment is unpaid")
            return jsonify({
                'success': False,
                'status': 'unpaid',
                'message': 'Payment is pending or has failed'
            }), 402
        else:
            print(f"Payment status is: {session.payment_status}")
            return jsonify({
                'success': False,
                'status': session.payment_status,
                'message': f'Payment status is: {session.payment_status}'
            }), 402
    
    except Exception as e:
        print(f"Error verifying session: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def handle_checkout_session_completed(session):
    """Handle a successful checkout session by updating the user's subscription in the database."""
    try:
        print(f"Starting handle_checkout_session_completed for session: {session.id}")
        print(f"Session data: {session}")
        
        # Get customer details
        customer = stripe.Customer.retrieve(session.customer)
        user_email = customer.email
        
        print(f"Retrieved customer: {customer.id} with email: {user_email}")
        
        # Get the subscription from the session using line_items
        subscription_id = None
        plan_id = None
        
        # Option 1: Get subscription from the checkout session directly if available
        if hasattr(session, 'subscription') and session.subscription:
            subscription_id = session.subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            # Check if items is callable (it's a method) or an attribute with data
            if hasattr(subscription, 'items'):
                if callable(subscription.items):
                    # If items is a method, call it to get the data
                    items_data = subscription.items()
                    plan_id = items_data.data[0].plan.id if items_data.data else None
                else:
                    # If items is an attribute with data property
                    plan_id = subscription.items.data[0].plan.id if hasattr(subscription.items, 'data') and subscription.items.data else None
            else:
                plan_id = None
            print(f"Got subscription from session: {subscription_id}, plan: {plan_id}")
        
        # Option 2: If subscription ID isn't directly available, we can try other approaches
        if not subscription_id and hasattr(session, 'line_items'):
            line_items = stripe.checkout.Session.list_line_items(session.id)
            if line_items and line_items.data:
                plan_id = line_items.data[0].price.id
                print(f"Got plan from line items: {plan_id}")
        
        # Find the user in the database by email
        user_found = False
        user_id = None
        
        # Try looking up in the users table
        user_response = supabase.from_('users').select('id').eq('email', user_email).execute()
        print(f"User lookup response: {user_response}")
        
        if user_response.data and len(user_response.data) > 0:
            user_id = user_response.data[0]['id']
            user_found = True
            print(f"Found user with ID: {user_id} in users table")
        else:
            # Try using the auth system
            try:
                auth_response = supabase.auth.admin.list_users()
                if hasattr(auth_response, 'users'):
                    matching_users = [u for u in auth_response.users if u.email == user_email]
                    if matching_users:
                        user_id = matching_users[0].id
                        user_found = True
                        print(f"Found user with ID: {user_id} in auth users list")
                    else:
                        print(f"Error: User with email {user_email} not found in auth.users")
                else:
                    print("Auth response has no users attribute")
            except Exception as auth_err:
                print(f"Error using auth API: {auth_err}")
        
        if not user_found:
            print(f"Could not find user with email {user_email} in any database table")
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Check if the user already has a subscription
        sub_response = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        print(f"Subscription lookup response: {sub_response}")
        
        if sub_response.data and len(sub_response.data) > 0:
            # Update existing subscription
            update_data = {
                'stripe_customer_id': customer.id,
                'plan_type': 'pro',  # Assuming all paid subscriptions are pro
                'status': 'active',
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if subscription_id:
                update_data['stripe_subscription_id'] = subscription_id
            
            if plan_id:
                update_data['stripe_price_id'] = plan_id
            
            # If we have a subscription, add the renewal date
            if subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                update_data['end_date'] = datetime.fromtimestamp(subscription.current_period_end).isoformat()
                
                # Handle items safely
                billing_period = 'month'  # Default
                if hasattr(subscription, 'items'):
                    if callable(subscription.items):
                        # If items is a method, call it to get the data
                        items_data = subscription.items()
                        if items_data.data and len(items_data.data) > 0:
                            billing_period = items_data.data[0].plan.interval
                    elif hasattr(subscription.items, 'data') and subscription.items.data:
                        # If items is an attribute with data property
                        billing_period = subscription.items.data[0].plan.interval
                
                update_data['billing_period'] = billing_period
            
            print(f"Updating existing subscription for user {user_id}")
            try:
                update_response = supabase.table('subscriptions').update(update_data).eq('user_id', user_id).execute()
                print(f"Subscription updated response: {update_response}")
            except Exception as update_err:
                print(f"Error updating subscription: {update_err}")
                return jsonify({'success': False, 'error': 'Database update error'}), 500
        else:
            # Create new subscription
            create_data = {
                'user_id': user_id,
                'stripe_customer_id': customer.id,
                'plan_type': 'pro',  # Assuming all paid subscriptions are pro
                'status': 'active',
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if subscription_id:
                create_data['stripe_subscription_id'] = subscription_id
            
            if plan_id:
                create_data['stripe_price_id'] = plan_id
            
            # If we have a subscription, add the renewal date
            if subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                create_data['end_date'] = datetime.fromtimestamp(subscription.current_period_end).isoformat()
                
                # Handle items safely
                billing_period = 'month'  # Default
                if hasattr(subscription, 'items'):
                    if callable(subscription.items):
                        # If items is a method, call it to get the data
                        items_data = subscription.items()
                        if items_data.data and len(items_data.data) > 0:
                            billing_period = items_data.data[0].plan.interval
                    elif hasattr(subscription.items, 'data') and subscription.items.data:
                        # If items is an attribute with data property
                        billing_period = subscription.items.data[0].plan.interval
                
                create_data['billing_period'] = billing_period
            
            print(f"Creating new subscription for user {user_id}")
            try:
                create_response = supabase.table('subscriptions').insert(create_data).execute()
                print(f"Subscription creation response: {create_response}")
            except Exception as create_err:
                print(f"Error creating subscription: {create_err}")
                return jsonify({'success': False, 'error': 'Database creation error'}), 500
        
        # Successfully processed the checkout session
        print(f"Successfully processed checkout session {session.id} for user {user_id}")
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Error in handle_checkout_session_completed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def handle_subscription_updated(subscription):
    # Update subscription status in database
    try:
        print(f"Processing subscription update for subscription ID: {subscription.id}")
        # We need to get the full customer details from Stripe
        customer = stripe.Customer.retrieve(subscription.customer)
        print(f"Retrieved customer: {customer.id}")
        
        if hasattr(customer, 'email') and customer.email:
            user_email = customer.email
        else:
            # If email is not available, try to get it from the Supabase database
            print(f"Email not found in customer object, looking it up in the database by customer ID")
            subscription_response = supabase.table('subscriptions').select('user_id').eq('stripe_customer_id', customer.id).execute()
            
            if subscription_response.data and len(subscription_response.data) > 0:
                user_id = subscription_response.data[0]['user_id']
                print(f"Found user ID: {user_id} by customer ID")
                
                # Update subscription in Supabase
                supabase.table('subscriptions').update({
                    'status': subscription.status,
                    'end_date': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute()
                
                print(f"Updated subscription {subscription.id} for user {user_id}")
                return
            
            # If we can't find the subscription by customer ID, we can't proceed
            print(f"Could not find user for customer ID: {customer.id}")
            return
        
        # Find the user by email in the users table
        user_response = supabase.from_('users').select('id').eq('email', user_email).execute()
        print(f"User lookup response for {user_email}: {user_response}")
        
        if not user_response.data or len(user_response.data) == 0:
            # Try using the subscription customer ID to find the user
            subscription_response = supabase.table('subscriptions').select('user_id').eq('stripe_customer_id', customer.id).execute()
            
            if subscription_response.data and len(subscription_response.data) > 0:
                user_id = subscription_response.data[0]['user_id']
                print(f"Found user ID: {user_id} by customer ID")
            else:
                # Try the auth API
                try:
                    auth_response = supabase.auth.admin.list_users()
                    if hasattr(auth_response, 'users'):
                        matching_users = [u for u in auth_response.users if u.email == user_email]
                        if matching_users:
                            user_id = matching_users[0].id
                            print(f"Found user with ID: {user_id} in auth users list")
                        else:
                            print(f"Error: User with email {user_email} not found in any database table")
                            return
                    else:
                        print("Auth response has no users attribute")
                        return
                except Exception as auth_err:
                    print(f"Error using auth API: {auth_err}")
                    return
        else:
            user_id = user_response.data[0]['id']
            print(f"Found user with ID: {user_id}")
        
        # Update subscription in Supabase
        update_response = supabase.table('subscriptions').update({
            'status': subscription.status,
            'end_date': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute()
        
        print(f"Updated subscription {subscription.id} for user {user_id}")
        print(f"Update response: {update_response}")
    except Exception as e:
        print(f"Error handling subscription update: {str(e)}")
        import traceback
        traceback.print_exc()

def handle_subscription_deleted(subscription):
    # Update subscription status to cancelled
    try:
        print(f"Processing subscription deletion for subscription ID: {subscription.id}")
        # We need to get the full customer details from Stripe
        customer = stripe.Customer.retrieve(subscription.customer)
        print(f"Retrieved customer: {customer.id}")
        
        if hasattr(customer, 'email') and customer.email:
            user_email = customer.email
        else:
            # If email is not available, try to get it from the Supabase database
            print(f"Email not found in customer object, looking it up in the database by customer ID")
            subscription_response = supabase.table('subscriptions').select('user_id').eq('stripe_customer_id', customer.id).execute()
            
            if subscription_response.data and len(subscription_response.data) > 0:
                user_id = subscription_response.data[0]['user_id']
                print(f"Found user ID: {user_id} by customer ID")
                
                # Update subscription in Supabase
                supabase.table('subscriptions').update({
                    'status': 'cancelled',
                    'plan_type': 'free',
                    'cancelled_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute()
                
                return
            
            # If we can't find the subscription by customer ID, we can't proceed
            print(f"Could not find user for customer ID: {customer.id}")
            return
        
        # Find the user by email in the users table
        user_response = supabase.from_('users').select('id').eq('email', user_email).execute()
        print(f"User lookup response for {user_email}: {user_response}")
        
        if not user_response.data or len(user_response.data) == 0:
            # Try using the subscription customer ID to find the user
            subscription_response = supabase.table('subscriptions').select('user_id').eq('stripe_customer_id', customer.id).execute()
            
            if subscription_response.data and len(subscription_response.data) > 0:
                user_id = subscription_response.data[0]['user_id']
                print(f"Found user ID: {user_id} by customer ID")
            else:
                # Try the auth API
                try:
                    auth_response = supabase.auth.admin.list_users()
                    if hasattr(auth_response, 'users'):
                        matching_users = [u for u in auth_response.users if u.email == user_email]
                        if matching_users:
                            user_id = matching_users[0].id
                            print(f"Found user with ID: {user_id} in auth users list")
                        else:
                            print(f"Error: User with email {user_email} not found in any database table")
                            return
                    else:
                        print("Auth response has no users attribute")
                        return
                except Exception as auth_err:
                    print(f"Error using auth API: {auth_err}")
                    return
        else:
            user_id = user_response.data[0]['id']
            print(f"Found user with ID: {user_id}")
        
        # Update subscription in Supabase
        supabase.table('subscriptions').update({
            'status': 'cancelled',
            'plan_type': 'free',
            'cancelled_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('user_id', user_id).eq('stripe_subscription_id', subscription.id).execute()
        
        print(f"Subscription {subscription.id} cancelled for user {user_id}")
    except Exception as e:
        print(f"Error handling subscription deletion: {str(e)}")
        import traceback
        traceback.print_exc() 