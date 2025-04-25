import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from supabase import create_client, Client
from functools import wraps
import jwt
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins='*')

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Configure Gemini API
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables")
    model = None
else:
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')  # Using gemini-pro instead of gemini-2.0-flash
        print("Successfully initialized Gemini API")
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        model = None

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user = data['sub']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Create user in Supabase
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            # Create initial user settings
            supabase.table('user_settings').insert({
                'user_id': auth_response.user.id,
                'preferred_summary_length': 'medium',
                'language': 'en',
                'theme': 'system'
            }).execute()
            
            # Create free subscription
            supabase.table('subscriptions').insert({
                'user_id': auth_response.user.id,
                'plan_type': 'free',
                'status': 'active',
                'start_date': datetime.utcnow().isoformat(),
                'end_date': (datetime.utcnow() + timedelta(days=30)).isoformat()
            }).execute()
            
            return jsonify({
                'message': 'User created successfully',
                'user_id': auth_response.user.id
            }), 201
        else:
            return jsonify({'error': 'Failed to create user'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            # Generate JWT token
            token = jwt.encode({
                'sub': auth_response.user.id,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(days=1)
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return jsonify({
                'token': token,
                'user_id': auth_response.user.id
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/refresh', methods=['POST'])
@token_required
def refresh_token(current_user):
    try:
        # Generate new JWT token
        token = jwt.encode({
            'sub': current_user,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=1)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return jsonify({
            'token': token,
            'user_id': current_user
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_user_limits(user_id):
    try:
        # Get user's subscription status
        result = supabase.from_('subscriptions').select('*').eq('user_id', user_id).execute()
        
        # Default limits for free tier
        if not result.data:
            return {
                'max_text_length': 10000,  # 10k characters
                'daily_summaries': 5,      # 5 summaries per day
                'plan_type': 'free'
            }
        
        subscription = result.data[0]
        plan = subscription['plan_type']
        
        # Define limits based on plan
        plan_limits = {
            'free': {
                'max_text_length': 10000,  # 10k characters
                'daily_summaries': 5       # 5 summaries per day
            },
            'pro': {
                'max_text_length': 50000,  # 50k characters
                'daily_summaries': 50      # 50 summaries per day
            },
            'enterprise': {
                'max_text_length': 100000, # 100k characters
                'daily_summaries': 1000    # 1000 summaries per day
            }
        }
        
        limits = plan_limits.get(plan, plan_limits['free'])
        limits['plan_type'] = plan
        return limits
        
    except Exception as e:
        print(f"Error getting user limits: {e}")
        # Return free tier limits as fallback
        return {
            'max_text_length': 10000,
            'daily_summaries': 5,
            'plan_type': 'free'
        }

@app.route('/user/limits', methods=['GET'])
@token_required
def get_user_limits_endpoint(current_user):
    try:
        limits = get_user_limits(current_user)
        return jsonify(limits), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get user limits: {e}"}), 500

@app.route('/user/usage', methods=['GET'])
@token_required
def get_user_usage(current_user):
    try:
        # Get today's usage
        today = datetime.utcnow().date().isoformat()
        result = supabase.table('daily_usage').select('*').eq('user_id', current_user).eq('date', today).execute()
        
        if not result.data:
            return jsonify({
                'summaries_count': 0,
                'characters_count': 0,
                'date': today
            }), 200
            
        return jsonify(result.data[0]), 200
    except Exception as e:
        print(f"Error getting usage: {e}")
        return jsonify({"error": f"Failed to get usage: {e}"}), 500

def get_user_id_from_token(token):
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return decoded['sub']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None

def get_authenticated_supabase(token):
    """Create an authenticated Supabase client with the JWT token"""
    client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    # Set the Authorization header
    client.postgrest.auth(token)
    return client

@app.route('/summarize', methods=['POST'])
def summarize_text():
    try:
        # Get the JWT token from the Authorization header
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'No valid token provided'}), 401
        
        # Create authenticated Supabase client
        auth_supabase = get_authenticated_supabase(token.split(' ')[1])
        
        # Extract user_id from token
        user_id = get_user_id_from_token(token.split(' ')[1])
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401

        # Get the text to summarize from request
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        text = data['text']
        char_count = len(text)
        
        # Get user limits and check them
        user_limits = get_user_limits(user_id)
        if char_count > user_limits['max_text_length']:
            return jsonify({
                'error': f"Text exceeds maximum length of {user_limits['max_text_length']} characters",
                'limit': user_limits['max_text_length'],
                'current': char_count
            }), 400
            
        # Get today's usage
        today = datetime.now().date().isoformat()
        result = auth_supabase.from_('daily_usage').select('*').eq('user_id', user_id).eq('date', today).execute()
        
        current_usage = result.data[0] if result.data else {'summaries_count': 0}
        summaries_count = current_usage.get('summaries_count', 0)
        
        if summaries_count >= user_limits['daily_summaries']:
            return jsonify({
                'error': 'Daily summary limit reached',
                'limit': user_limits['daily_summaries'],
                'current': summaries_count
            }), 429

        # Get user settings for summary preferences
        settings_result = auth_supabase.from_('user_settings').select('*').eq('user_id', user_id).execute()
        settings = settings_result.data[0] if settings_result.data else {
            'preferred_summary_length': '2-3 sentences (medium)',
            'summary_tone': 'neutral',
            'summary_difficulty': 'medium'
        }

        # Get user's plan type
        user_limits = get_user_limits(user_id)
        is_pro = user_limits['plan_type'] in ['pro', 'enterprise']

        # Check for override parameters (only for pro users)
        if is_pro:
            override_tone = data.get('override_tone')
            override_difficulty = data.get('override_difficulty')
            
            if override_tone:
                settings['summary_tone'] = override_tone
            if override_difficulty:
                settings['summary_difficulty'] = override_difficulty

        # Generate summary using Gemini
        if not model:
            return jsonify({
                "error": "Summarization service is not available. Please check server configuration."
            }), 503

        # Extract the length from the preferred_summary_length value
        length = settings['preferred_summary_length'].split(' (')[0]  # Gets "2-3 sentences" from "2-3 sentences (medium)"

        # Build prompt based on user's plan type
        if is_pro:
            prompt = f"""Please summarize the following text in {length}.
Use a {settings['summary_tone']} tone and target a {settings['summary_difficulty']} comprehension level.

Text to summarize:
---
{text}
---"""
        else:
            prompt = f"""Please summarize the following text in {length}.

Text to summarize:
---
{text}
---"""

        response = model.generate_content(prompt)
        
        if not response or not response.text:
            raise Exception("Failed to generate summary")
            
        summary = response.text.strip()
        
        # Update daily usage
        new_usage = {
            'user_id': user_id,
            'date': today,
            'summaries_count': summaries_count + 1,
            'total_characters': (current_usage.get('total_characters', 0) or 0) + char_count
        }
        
        # Use upsert with conflict target
        auth_supabase.from_('daily_usage').upsert(
            new_usage,
            on_conflict='user_id,date'
        ).execute()
        
        return jsonify({
            'summary': summary,
            'usage': {
                'daily_summaries': {
                    'current': summaries_count + 1,
                    'limit': user_limits['daily_summaries']
                },
                'text_length': {
                    'current': char_count,
                    'limit': user_limits['max_text_length']
                }
            }
        })
        
    except Exception as e:
        print(f"Error in summarize_text: {e}")
        return jsonify({'error': 'Failed to generate summary'}), 500

@app.route('/summaries/save', methods=['POST'])
def save_summary():
    try:
        # Get the JWT token from the Authorization header
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            print("No valid token provided in request headers")
            return jsonify({'error': 'No valid token provided'}), 401
        
        # Create authenticated Supabase client
        auth_supabase = get_authenticated_supabase(token.split(' ')[1])
        
        # Extract user_id from token
        user_id = get_user_id_from_token(token.split(' ')[1])
        if not user_id:
            print("Invalid token or failed to extract user_id")
            return jsonify({'error': 'Invalid token'}), 401

        data = request.get_json()
        if not data:
            print("No data provided in request body")
            return jsonify({'error': 'No data provided'}), 400

        print("Received save request with data:", data)

        # Extract required fields
        summary = data.get('summary')
        original_text = data.get('original_text')
        source_url = data.get('source_url')
        character_count = data.get('character_count')

        if not all([summary, original_text, character_count]):
            missing_fields = []
            if not summary: missing_fields.append('summary')
            if not original_text: missing_fields.append('original_text')
            if not character_count: missing_fields.append('character_count')
            print(f"Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400

        # Save summary to database
        print(f"Attempting to save summary for user {user_id}")
        result = auth_supabase.from_('summaries').insert({
            'user_id': user_id,
            'original_text': original_text,
            'summary': summary,
            'source_url': source_url,
            'character_count': character_count
        }).execute()

        if not result.data:
            print("Failed to save summary - no data returned from Supabase")
            raise Exception("Failed to save summary")

        print(f"Successfully saved summary with ID: {result.data[0]['id']}")
        return jsonify({
            'message': 'Summary saved successfully',
            'id': result.data[0]['id']
        }), 201

    except Exception as e:
        print(f"Error saving summary: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to save summary'}), 500

@app.route('/summaries', methods=['GET'])
@token_required
def get_summaries(current_user):
    try:
        # Get user's summaries from database
        result = supabase.table('summaries').select('*').eq('user_id', current_user).order('created_at', desc=True).execute()
        return jsonify(result.data), 200
    except Exception as e:
        print(f"Error fetching summaries: {e}")
        return jsonify({"error": f"Failed to fetch summaries: {e}"}), 500

@app.route('/user/settings', methods=['GET'])
def get_user_settings():
    try:
        # Get the JWT token from the Authorization header
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'No valid token provided'}), 401
        
        # Create authenticated Supabase client
        auth_supabase = get_authenticated_supabase(token.split(' ')[1])
        
        # Extract user_id from token
        user_id = get_user_id_from_token(token.split(' ')[1])
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401

        # Try to get user's settings
        result = auth_supabase.from_('user_settings').select('*').eq('user_id', user_id).execute()
        
        # If no settings exist, create default settings
        if not result.data:
            default_settings = {
                'user_id': user_id,
                'preferred_summary_length': 'medium',
                'theme': 'system'
            }
            result = auth_supabase.from_('user_settings').insert(default_settings).execute()
        
        return jsonify(result.data[0]), 200
    except Exception as e:
        print(f"Error fetching settings: {e}")
        return jsonify({"error": f"Failed to fetch settings: {e}"}), 500

@app.route('/user/settings', methods=['POST'])
@token_required
def update_user_settings(current_user):
    try:
        data = request.get_json()
        
        # Get the authenticated Supabase client for enum validation
        auth_supabase = get_authenticated_supabase(request.headers.get('Authorization').split(' ')[1])
        
        # Get valid enum values
        enum_values = auth_supabase.rpc('get_enum_values').execute()
        if not enum_values.data:
            raise Exception("Failed to get enum values for validation")
            
        # Create validation map from enum values
        valid_settings = {
            'preferred_summary_length': [v for item in enum_values.data if item['enum_name'] == 'summary_length' for v in item['enum_values']],
            'theme': ['light', 'dark', 'system'],
            'summary_tone': [v for item in enum_values.data if item['enum_name'] == 'summary_tone' for v in item['enum_values']],
            'summary_difficulty': [v for item in enum_values.data if item['enum_name'] == 'summary_difficulty' for v in item['enum_values']]
        }
        
        for key, value in data.items():
            if key in valid_settings and value not in valid_settings[key]:
                return jsonify({"error": f"Invalid value for {key}"}), 400

        # Check if settings exist
        existing_settings = supabase.from_('user_settings').select('*').eq('user_id', current_user).execute()
        
        if existing_settings.data:
            # Update existing settings
            result = supabase.from_('user_settings').update({
                **data
            }).eq('user_id', current_user).execute()
        else:
            # Create new settings
            result = supabase.from_('user_settings').insert({
                'user_id': current_user,
                **data
            }).execute()

        if not result.data:
            raise Exception("Failed to update settings")

        return jsonify(result.data[0]), 200
    except Exception as e:
        print(f"Error updating settings: {e}")
        return jsonify({"error": f"Failed to update settings: {e}"}), 500

@app.route('/rpc/get_enum_values', methods=['POST'])
@token_required
def get_enum_values(current_user):
    try:
        # Get the authenticated Supabase client
        auth_supabase = get_authenticated_supabase(request.headers.get('Authorization').split(' ')[1])
        
        # Get enum values from the database
        result = auth_supabase.rpc('get_enum_values').execute()
        
        if not result.data:
            raise Exception("Failed to get enum values")
            
        return jsonify(result.data), 200
    except Exception as e:
        print(f"Error getting enum values: {e}")
        return jsonify({"error": f"Failed to get enum values: {e}"}), 500

@app.route('/')
def home():
    return "LightRead Summarization Server is running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
