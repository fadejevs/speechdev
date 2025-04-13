import deepl
from flask import Blueprint, request, jsonify, current_app
from app.services.firebase_service import FirebaseService
from app.services.translation_service import TranslationService
import logging
import os

# --- Define the Blueprint ---
translation_bp = Blueprint('translation', __name__)

# --- Configuration and Service Instantiation ---
# Consider loading the key from config for better practice:
# auth_key = current_app.config.get('DEEPL_AUTH_KEY')
# if not auth_key:
#     current_app.logger.error("DEEPL_AUTH_KEY not found in configuration!")
# For now, keeping the hardcoded key:
auth_key = "e7552ee8-ca29-4b47-8e86-72c21678cb0c:fx"

# Handle potential errors during translator instantiation
try:
    translator = deepl.Translator(auth_key)
except Exception as e:
    # Log the error during app startup if possible, or handle it differently
    # This might be tricky outside a request context.
    # For now, we'll let it potentially raise an error if the key is invalid at startup.
    print(f"Error initializing DeepL Translator: {e}") # Basic print for startup issues
    translator = None # Set to None if initialization fails

firebase_service = FirebaseService()

# --- Route Definition using the Blueprint ---
@translation_bp.route('/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        
        if not data:
            logging.error("No JSON data received in translation request")
            return jsonify({"error": "No data provided"}), 400
            
        text = data.get('text')
        source_language = data.get('source_language', 'auto')
        target_language = data.get('target_language')
        
        logging.info(f"Translation request received - Text: '{text[:30]}...' Source: '{source_language}' Target: '{target_language}'")
        
        if not text:
            logging.error("No text provided for translation")
            return jsonify({"error": "No text provided"}), 400
            
        if not target_language:
            logging.error("No target language provided for translation")
            return jsonify({"error": "No target language provided"}), 400
        
        # Get translation service
        translation_service = current_app.config.get('TRANSLATION_SERVICE')
        if not translation_service:
            translation_service = TranslationService()
            current_app.config['TRANSLATION_SERVICE'] = translation_service
            logging.info(f"Created new TranslationService with service type: {translation_service.service}")
        
        # Perform translation
        translated_text = translation_service.translate(text, source_language, target_language)
        
        if translated_text:
            return jsonify({
                "original_text": text,
                "translated_text": translated_text,
                "source_language": source_language,
                "target_language": target_language
            })
        else:
            logging.error(f"Translation failed for text: '{text[:30]}...' to {target_language}")
            return jsonify({"error": "Translation failed"}), 500
        
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        return jsonify({"error": f"Translation error: {str(e)}"}), 500

@translation_bp.route('/translation-status', methods=['GET'])
def translation_status():
    """Check the status of the translation service"""
    try:
        # Get or create translation service
        translation_service = current_app.config.get('TRANSLATION_SERVICE')
        if not translation_service:
            translation_service = TranslationService()
            current_app.config['TRANSLATION_SERVICE'] = translation_service
        
        # Return service info
        return jsonify({
            "service": translation_service.service,
            "is_configured": translation_service.service != "mock",
            "available_services": {
                "azure": bool(os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_REGION')),
                "deepl": bool(os.environ.get('DEEPL_API_KEY') and os.environ.get('DEEPL_API_URL'))
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def simple_translation(text, target_lang):
    """
    A very simple fallback translation function that returns a message
    when DeepL API is not available
    """
    # Simple mock translations for Latvian
    if target_lang.startswith('lv'):
        translations = {
            'test': 'tests',
            'testing': 'testēšana',
            'hello': 'sveiki',
            'world': 'pasaule',
            'thank you': 'paldies',
            'goodbye': 'uz redzēšanos'
        }
        
        lower_text = text.lower()
        for eng, trans in translations.items():
            if eng in lower_text:
                return trans
                
        return f"Tulkojums latviešu valodā: {text}"
    
    return f"[Translation to {target_lang}] {text}"