from flask import request, jsonify
from flask_cors import cross_origin

@app.route('/api/cancel-subscription', methods=['POST'])
@cross_origin()
def cancel_subscription():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        result = stripe_api.cancel_subscription(email)
        return jsonify(result)
    except Exception as e:
        print(f"Error in cancel_subscription route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment-methods', methods=['GET'])
@cross_origin()
def get_payment_methods():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        result = stripe_api.get_payment_methods(email)
        return jsonify(result)
    except Exception as e:
        print(f"Error getting payment methods: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment-methods', methods=['POST'])
@cross_origin()
def update_payment_method():
    try:
        data = request.get_json()
        email = data.get('email')
        payment_method_id = data.get('payment_method_id')
        
        if not email or not payment_method_id:
            return jsonify({'error': 'Email and payment method ID are required'}), 400
            
        result = stripe_api.update_payment_method(email, payment_method_id)
        return jsonify(result)
    except Exception as e:
        print(f"Error updating payment method: {str(e)}")
        return jsonify({'error': str(e)}), 500 