from flask import Blueprint, render_template, jsonify, current_app, request
from app.services.firebase_service import FirebaseService
import logging

# Define the blueprint object named 'main_bp' to match the import in __init__.py
main_bp = Blueprint('main', __name__)

firebase_service = FirebaseService()

@main_bp.route('/')
def index():
    """Serves the main HTML page or a welcome message."""
    # Option 1: Render an HTML template (if you have one in a 'templates' folder)
    # try:
    #     return render_template('index.html')
    # except Exception as e:
    #     logging.error(f"Could not render index.html: {e}")
    #     return jsonify({"error": "Could not load frontend page"}), 500

    # Option 2: Return a simple JSON message
    return jsonify({"message": "Welcome to the Real-Time Translation API"})

@main_bp.route('/health')
def health_check():
    """Basic health check endpoint."""
    # You could add checks here for database connections, service availability etc.
    # Example check for services initialized in __init__
    try:
        t_service = current_app.translation_service
        s_service = current_app.speech_service
        t_status = getattr(t_service, 'service_type', 'uninitialized')
        s_status = bool(getattr(s_service, 'speech_config', None))
        return jsonify({
            "status": "ok",
            "services": {
                "translation": t_status,
                "speech": "configured" if s_status else "unconfigured"
            }
        })
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({"status": "error", "details": str(e)}), 500

# Add any other general-purpose routes for your application here.
# For example, a route to show API documentation or info.
@main_bp.route('/info')
def info():
    """Provides basic info about the API."""
    # Access config safely if needed
    secret_key_set = bool(current_app.config.get('SECRET_KEY') and current_app.config['SECRET_KEY'] != 'a-very-weak-default-secret-key-CHANGE-ME')
    return jsonify({
        "api_name": "Real-Time Translation API",
        "version": "1.0.0",
        "flask_secret_key_set": secret_key_set
    })

@main_bp.route('/translate', methods=['POST'])
def translate_text():
    """Super simple translation endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        text = data.get('text', '')
        source_language = data.get('source_language', 'auto')
        target_language = data.get('target_language', 'en')
        
        logging.info(f"Translation request: '{text}' from {source_language} to {target_language}")
        
        # Simple mock translations
        translations = {
            'lv': {
                'test': 'tests',
                'testing': 'testēšana',
                'hello': 'sveiki',
                'world': 'pasaule',
                'thank you': 'paldies',
                'goodbye': 'uz redzēšanos'
            }
        }
        
        # Get target language code without region
        target_code = target_language.split('-')[0].lower()
        
        # Check if we have translations for this language
        if target_code in translations:
            # Check if we have a translation for this text
            lower_text = text.lower()
            for eng, trans in translations[target_code].items():
                if eng in lower_text:
                    return jsonify({
                        'translated_text': trans,
                        'source_language': source_language,
                        'target_language': target_language
                    })
        
        # Default fallback translation
        return jsonify({
            'translated_text': f"[{target_language}] {text}",
            'source_language': source_language,
            'target_language': target_language
        })
        
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        # Even on error, return a valid response
        return jsonify({
            'translated_text': f"[Translation error]",
            'source_language': source_language if 'source_language' in locals() else 'unknown',
            'target_language': target_language if 'target_language' in locals() else 'unknown'
        })

@main_bp.route('/api/transcripts', methods=['GET'])
def get_transcripts():
    try:
        transcripts = firebase_service.get_transcripts(limit=20)
        return jsonify(transcripts), 200
    except Exception as e:
        current_app.logger.error(f"Error getting transcripts: {e}")
        return jsonify({'error': str(e)}), 500 