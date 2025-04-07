import deepl
from flask import Blueprint, request, jsonify, current_app
from app.services.firebase_service import FirebaseService

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
@translation_bp.route('/translate', methods=['POST']) # Use the blueprint decorator
def translate_text():
    if translator is None:
        current_app.logger.error("DeepL Translator was not initialized correctly.")
        return jsonify({'error': 'Translation service configuration error'}), 500

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload'}), 400

    text = data.get('text')
    target_lang = data.get('target_lang') # Removed default 'EN' - require target lang

    if not text or not target_lang:
        return jsonify({'error': 'Missing "text" or "target_lang" in request'}), 400

    # Validate target_lang format if needed (e.g., 'EN-US', 'DE', 'LV')
    # DeepL uses specific codes, check their documentation.

    try:
        # Perform the translation
        result = translator.translate_text(text, target_lang=target_lang)
        translated_text = result.text
        detected_source_lang = result.detected_source_lang # Get detected source lang

        # Store in Firebase
        transcript_id = firebase_service.store_transcript(
            text=text,
            transcript_type='translation',
            source_lang=detected_source_lang, # Store the detected language
            translated_text=translated_text,
            target_lang=target_lang
        )

        # Return the result
        return jsonify({
            'translated_text': translated_text,
            'detected_source_language': detected_source_lang,
            'transcript_id': transcript_id
        })

    except deepl.DeepLException as e:
        # Handle specific DeepL errors (e.g., quota exceeded, invalid lang)
        current_app.logger.error(f"DeepL API error: {e}")
        return jsonify({'error': f'DeepL error: {e}'}), 500
    except Exception as e:
        # Handle other potential errors
        current_app.logger.exception("An unexpected error occurred during translation:") # Log traceback
        return jsonify({'error': 'An internal server error occurred'}), 500

def simple_translation(text, target_lang):
    """
    A very simple fallback translation function that returns a message
    when DeepL API is not available
    """
    return f"[Translation to {target_lang} failed: DeepL API unavailable]"