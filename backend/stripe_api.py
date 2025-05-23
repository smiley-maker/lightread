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
        price_id = data.get('priceId', STRIPE_PRICE_ID)  # Use priceId from request, fallback to env var
        redirect_path = data.get('redirectPath', '/dashboard?tab=billing')  # Allow custom redirect path
        
        if not price_id:
            return jsonify({'error': 'Price ID is required'}), 400
            
        print(f"Creating checkout session for email: {customer_email} and price ID: {price_id}")
        print(f"Redirect path: {redirect_path}")
        
        # Base URL for redirects - use environment variable or fallback
        base_url = os.environ.get('FRONTEND_URL', 'https://www.lightread.xyz')
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f'{base_url}{redirect_path}&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{base_url}{redirect_path}',
            customer_email=customer_email,
        )
        
        print(f"Created checkout session: {session.id} for {customer_email}")
        print(f"Success URL: {base_url}{redirect_path}&session_id={{CHECKOUT_SESSION_ID}}")
        
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
    print("==================== WEBHOOK REQUEST ====================")
    print(f"Request data: {payload.decode('utf-8')}")
    print(f"Signature header: {sig_header}")
    print(f"Content-Type: {request.headers.get('Content-Type')}")
    print(f"X-Forwarded-For: {request.headers.get('X-Forwarded-For')}")
    print(f"User-Agent: {request.headers.get('User-Agent')}")
    print("==================== END REQUEST INFO ====================")
    
    try:
        # Verify the webhook signature
        if not sig_header:
            print("No Stripe-Signature header found")
            return jsonify({'error': 'No signature header'}), 400
            
        if not config.STRIPE_WEBHOOK_SECRET:
            print("STRIPE_WEBHOOK_SECRET is not set")
            return jsonify({'error': 'Webhook secret not configured'}), 500
            
        # Construct the event using the payload and signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET
        )
        print(f"Webhook event constructed successfully: {event.type}")
        print(f"Event ID: {event.id}")
        print(f"Event data: {event.data.object}")
        
        # Handle different event types
        try:
            if event.type == 'checkout.session.completed':
                session = event.data.object
                print(f"Processing checkout.session.completed for session: {session.id}")
                print(f"Session status: {session.status}")
                print(f"Payment status: {session.payment_status}")
                print(f"Customer email: {session.customer_email}")
                if hasattr(session, 'subscription'):
                    print(f"Subscription ID: {session.subscription}")
                else:
                    print("No subscription ID in session")
                # Process the checkout session
                handle_checkout_session_completed(session)
            elif event.type == 'customer.subscription.updated':
                subscription = event.data.object
                print(f"Processing customer.subscription.updated for subscription: {subscription.id}")
                print(f"Subscription status: {subscription.status}")
                print(f"Customer ID: {subscription.customer}")
                # Update subscription status
                handle_subscription_updated(subscription)
            elif event.type == 'customer.subscription.deleted':
                subscription = event.data.object
                print(f"Processing customer.subscription.deleted for subscription: {subscription.id}")
                # Mark subscription as cancelled
                handle_subscription_deleted(subscription)
            elif event.type == 'invoice.paid':
                # Handle the invoice paid event
                invoice = event.data.object
                print(f"Processing invoice.paid event for invoice: {invoice.id}")
                print(f"Invoice status: {invoice.status}")
                
                # Check for subscription ID in different places
                subscription_id = None
                
                # Try parent.subscription_details.subscription first
                if hasattr(invoice, 'parent') and invoice.parent and hasattr(invoice.parent, 'subscription_details'):
                    if hasattr(invoice.parent.subscription_details, 'subscription'):
                        subscription_id = invoice.parent.subscription_details.subscription
                        print(f"Found subscription ID in parent.subscription_details: {subscription_id}")
                        
                # If not there, try direct subscription attribute
                if not subscription_id and hasattr(invoice, 'subscription') and invoice.subscription:
                    subscription_id = invoice.subscription
                    print(f"Found subscription ID in invoice.subscription: {subscription_id}")
                
                # If we found a subscription ID, process it
                if subscription_id:
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
        except Exception as handler_err:
            # Don't return an error response to Stripe - this would cause Stripe to retry the webhook
            # Instead, log the error and return 200 to acknowledge receipt
            print(f"Error handling event {event.type}: {str(handler_err)}")
            import traceback
            traceback.print_exc()
        
        # Always return a 200 response to acknowledge receipt of the webhook
        # Stripe will retry webhooks that don't receive a 2xx response
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
        import traceback
        traceback.print_exc()
        # Still return 200 to avoid Stripe retrying - we've logged the error
        return jsonify({'status': 'received_with_errors', 'error': str(e)}), 200

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
            
            # Get customer email from the session
            customer_email = None
            if hasattr(session, 'customer') and session.customer and hasattr(session.customer, 'email'):
                customer_email = session.customer.email
            elif hasattr(session, 'customer_email'):
                customer_email = session.customer_email
                
            print(f"Customer email: {customer_email}")
            
            # Find user ID from email
            user_id = None
            if customer_email:
                try:
                    print("Looking up user in auth.users...")
                    auth_response = supabase.auth.admin.list_users()
                    
                    # The response might be a list directly rather than an object with 'users' attribute
                    users_list = auth_response
                    if hasattr(auth_response, 'users'):
                        users_list = auth_response.users
                        
                    print(f"Auth response contains {len(users_list)} users")
                    
                    for user in users_list:
                        # User might be a dictionary or an object
                        user_email_from_list = user.email if hasattr(user, 'email') else user.get('email')
                        user_id_from_list = user.id if hasattr(user, 'id') else user.get('id')
                        
                        if user_email_from_list == customer_email:
                            user_id = user_id_from_list
                            print(f"Found user with ID: {user_id} in auth users list")
                            break
                            
                    if not user_id:
                        print(f"User not found in auth.users with email: {customer_email}")
                except Exception as auth_err:
                    print(f"Error using auth API: {auth_err}")
                    import traceback
                    traceback.print_exc()
            
            # If we found a user ID, update their subscription
            if user_id and hasattr(session, 'subscription') and session.subscription:
                try:
                    # Get subscription details
                    subscription = stripe.Subscription.retrieve(session.subscription)
                    
                    # Update or create subscription in database
                    subscription_data = {
                        'user_id': user_id,
                        'stripe_customer_id': session.customer.id if hasattr(session, 'customer') else None,
                        'stripe_subscription_id': session.subscription,
                        'plan_type': 'pro',
                        'status': 'active',
                        'updated_at': datetime.utcnow().isoformat(),
                        'end_date': datetime.fromtimestamp(subscription.current_period_end).isoformat()
                    }
                    
                    # Check if subscription exists
                    existing_sub = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
                    
                    if existing_sub.data and len(existing_sub.data) > 0:
                        print(f"Updating existing subscription for user {user_id}")
                        supabase.table('subscriptions').update(subscription_data).eq('user_id', user_id).execute()
                    else:
                        print(f"Creating new subscription for user {user_id}")
                        subscription_data['created_at'] = datetime.utcnow().isoformat()
                        supabase.table('subscriptions').insert(subscription_data).execute()
                        
                    print("Successfully updated subscription in database")
                except Exception as db_err:
                    print(f"Database error updating subscription: {db_err}")
            
            # Process the successful checkout
            handle_checkout_session_completed(session)
            
            return jsonify({
                'success': True,
                'status': 'paid',
                'customer_email': customer_email,
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
    """
    Handle a completed checkout session
    """
    print("\n==================== HANDLING CHECKOUT SESSION ====================")
    print(f"Session ID: {session.id}")
    print(f"Customer email: {session.customer_email}")
    if hasattr(session, 'subscription'):
        print(f"Subscription ID: {session.subscription}")
    else:
        print("No subscription ID in session")
    print(f"Payment status: {session.payment_status}")
    
    try:
        # Get the customer details
        customer = stripe.Customer.retrieve(session.customer)
        print(f"\nRetrieved customer: {customer.id}")
        print(f"Customer email: {customer.email}")
        print(f"Customer metadata: {customer.metadata}")
        
        # Get the subscription details if available
        subscription = None
        if hasattr(session, 'subscription') and session.subscription:
            subscription = stripe.Subscription.retrieve(session.subscription)
            print(f"\nRetrieved subscription: {subscription.id}")
            print(f"Subscription status: {subscription.status}")
            
            # Handle items data properly
            subscription_items = None
            if hasattr(subscription, 'items'):
                if callable(subscription.items):
                    # If items is a method, call it to get the data
                    subscription_items = subscription.items()
                    print(f"Subscription items (method call): {subscription_items}")
                else:
                    # If items is an attribute
                    print(f"Subscription items (attribute): {subscription.items}")
                    subscription_items = subscription.items
            
            if subscription_items and hasattr(subscription_items, 'data'):
                print(f"Subscription items data: {subscription_items.data}")
        else:
            print("\nNo subscription ID in the session, looking for it in line items...")
            # Try to get subscription information from line items
            line_items = stripe.checkout.Session.list_line_items(session.id)
            print(f"Line items: {line_items.data}")
        
        # Find the user in the database using the customer email
        user_email = customer.email
        if not user_email and hasattr(session, 'customer_email'):
            user_email = session.customer_email
        
        if not user_email:
            print("ERROR: Could not find customer email!")
            return
            
        print(f"\nLooking up user in database with email: {user_email}")
        
        # Skip trying to look up in users table since it doesn't exist
        # Go directly to auth.users
        user_id = None
        try:
            print("Looking up user in auth.users...")
            auth_response = supabase.auth.admin.list_users()
            
            # The response might be a list directly rather than an object with 'users' attribute
            users_list = auth_response
            if hasattr(auth_response, 'users'):
                users_list = auth_response.users
                
            print(f"Auth response contains {len(users_list)} users")
            
            for user in users_list:
                # User might be a dictionary or an object
                user_email_from_list = user.email if hasattr(user, 'email') else user.get('email')
                user_id_from_list = user.id if hasattr(user, 'id') else user.get('id')
                
                if user_email_from_list == user_email:
                    user_id = user_id_from_list
                    print(f"Found user with ID: {user_id} in auth users list")
                    break
                    
            if not user_id:
                print(f"User not found in auth.users with email: {user_email}")
                return
        except Exception as auth_err:
            print(f"Error using auth API: {auth_err}")
            import traceback
            traceback.print_exc()
            return
        
        # Update or create subscription in database
        print(f"\nUpdating subscription in database for user ID: {user_id}")
        
        # Current timestamp for created_at/updated_at
        now = datetime.utcnow().isoformat()
        
        subscription_data = {
            'user_id': user_id,
            'stripe_customer_id': customer.id,
            'plan_type': 'pro',
            'status': 'active',
            'updated_at': now
        }
        
        if subscription:
            subscription_data['stripe_subscription_id'] = subscription.id
            
            # Use end_date for the column name, not current_period_end
            if hasattr(subscription, 'current_period_end'):
                subscription_data['end_date'] = datetime.fromtimestamp(subscription.current_period_end).isoformat()
                print(f"Setting end_date to: {subscription_data['end_date']}")
            
        print(f"Subscription data to update: {subscription_data}")
        
        # Check if subscription exists
        try:
            existing_sub = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
            print(f"Existing subscription check: {existing_sub}")
        
            if existing_sub.data and len(existing_sub.data) > 0:
                print("Updating existing subscription...")
                update_response = supabase.table('subscriptions').update(subscription_data).eq('user_id', user_id).execute()
                print(f"Update response: {update_response}")
            else:
                print("Creating new subscription...")
                subscription_data['created_at'] = now
                subscription_data['start_date'] = now  # Add start_date for new subscriptions
                create_response = supabase.table('subscriptions').insert(subscription_data).execute()
                print(f"Create response: {create_response}")
                
            print("Successfully updated subscription in database")
        except Exception as db_err:
            print(f"Database error: {db_err}")
            import traceback
            traceback.print_exc()
            
        print("==================== END CHECKOUT SESSION HANDLING ====================\n")
        
    except Exception as e:
        print(f"Error in handle_checkout_session_completed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

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