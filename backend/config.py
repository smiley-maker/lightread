import os

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET')

# AI configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Stripe product and price IDs
STRIPE_PRODUCT_ID = os.environ.get('STRIPE_PRODUCT_ID')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID')

# Application configuration
DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here') 