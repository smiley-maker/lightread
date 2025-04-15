import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS # Import CORS

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing requests from the extension

# Configure the Gemini API client
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file or environment variables.")
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel('gemini-pro') # Or choose another suitable model
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    # Handle the error appropriately, maybe exit or provide a default behavior
    model = None # Ensure model is None if configuration fails

@app.route('/summarize', methods=['GET'])
def summarize_text():
    if not model:
        return jsonify({"error": "Gemini API not configured properly."}), 500

    text_to_summarize = request.args.get('text')

    if not text_to_summarize:
        return jsonify({"error": "Missing 'text' parameter in JSON body"}), 400

    try:
        # Construct the prompt for summarization
        prompt = f"""Please summarize the following text:

---
{text_to_summarize}
---

Summary:"""

        response = model.generate_content(prompt)

        # Make sure response and parts exist
        if response and response.parts:
            summary = response.text # Access the text directly
        else:
            # Fallback or error handling if the expected response structure isn't found
            summary = "Could not generate summary." 
            # Log the actual response for debugging
            print(f"Unexpected Gemini response format: {response}") 

        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        # Consider logging the full traceback for debugging
        # import traceback
        # print(traceback.format_exc())
        return jsonify({"error": f"Failed to generate summary: {e}"}), 500

# Simple root route to check if the server is running
@app.route('/')
def home():
    return "LightRead Summarization Server is running!"

if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on the network
    # Change port if 5000 is already in use
    app.run(host='0.0.0.0', port=5000, debug=True) # Enable debug for development
