# import deepl # Not needed if using TranslationService exclusively
from flask import Blueprint, request, jsonify, current_app
from app.services.firebase_service import FirebaseService
# from app.services.translation_service import TranslationService # Not needed if using current_app
import logging
import os

# --- Define the Blueprint ---
translation_bp = Blueprint('translation', __name__)

# --- Configuration and Service Instantiation ---
# Remove direct key access and translator instantiation
# auth_key = "e7552ee8-ca29-4b47-8e86-72c21678cb0c:fx"
# translator = deepl.Translator(auth_key) # Remove this

# Firebase service might still be needed if used independently
firebase_service = FirebaseService()

# --- Helper Function to Get Translation Service ---
def get_translation_service():
    try:
        service = current_app.translation_service
        if not service or not service.service_type:
             logging.error("Translation service not available or not configured.")
             return None
        return service
    except RuntimeError:
        logging.error("Attempted to access translation service outside Flask app context!")
        return None
    except AttributeError:
        logging.error("Translation service not found on current_app. Check app initialization.")
        return None

# --- Routes ---

@translation_bp.route('/translate-text', methods=['POST'])
def translate_text_route():
    """Translate text using the configured TranslationService."""
    translation_service = get_translation_service()
    if not translation_service:
        return jsonify({"error": "Translation service not configured or unavailable"}), 503

    data = request.get_json()
    if not data or 'text' not in data or 'target_language' not in data:
        logging.error("Missing 'text' or 'target_language' in translation request.")
        return jsonify({"error": "Missing 'text' or 'target_language'"}), 400

    text = data['text']
    target_language = data['target_language']
    source_language = data.get('source_language', 'auto') # Default to auto-detect

    logging.info(f"Received translation request via blueprint: '{text[:50]}...' from '{source_language}' to '{target_language}'")

    try:
        # Use the translate_text method from the service
        # Ensure this method exists and handles errors appropriately in TranslationService
        translated_text = translation_service.translate_text(text, target_language)

        if translated_text and not translated_text.startswith("Error:"):
            logging.info(f"Translation successful via {translation_service.service_type}: '{translated_text[:50]}...'")
            return jsonify({
                'translated_text': translated_text,
                'source_language': source_language, # Or detected lang if service returns it
                'target_language': target_language
            })
        else:
            logging.error(f"Translation failed using {translation_service.service_type}. Result: {translated_text}")
            error_message = translated_text if translated_text else "Translation failed"
            return jsonify({"error": error_message}), 500

    except Exception as e:
        logging.error(f"Error during translation request: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred during translation"}), 500


@translation_bp.route('/save-translation', methods=['POST'])
def save_translation():
    """Save translation pair to Firebase"""
    data = request.get_json()
    if not data or 'original' not in data or 'translated' not in data or 'language_pair' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        firebase_service.save_translation(
            data['original'],
            data['translated'],
            data['language_pair'] # e.g., "en-es"
        )
        return jsonify({"message": "Translation saved successfully"}), 201
    except Exception as e:
        logging.error(f"Error saving translation to Firebase: {e}", exc_info=True)
        return jsonify({"error": f"Failed to save translation: {e}"}), 500


@translation_bp.route('/translation-history', methods=['GET'])
def get_translation_history():
    """Get translation history from Firebase"""
    try:
        history = firebase_service.get_translation_history()
        return jsonify(history)
    except Exception as e:
        logging.error(f"Error fetching translation history from Firebase: {e}", exc_info=True)
        return jsonify({"error": f"Failed to fetch history: {e}"}), 500


@translation_bp.route('/translation-status', methods=['GET'])
def translation_status():
    """Check the status of the translation service"""
    translation_service = get_translation_service()

    if not translation_service:
         # If service couldn't be retrieved, report basic status
         return jsonify({
             "service": "unavailable",
             "is_configured": False,
             "available_services": { # Check env vars directly as fallback info
                 "azure": bool(os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_REGION')),
                 "deepl": bool(os.environ.get('DEEPL_API_KEY')) # DEEPL_API_URL has default
             }
         }), 503

    # Return service info from the actual service instance
    return jsonify({
        "service": translation_service.service_type or "none", # Use service_type
        "is_configured": translation_service.service_type is not None,
        "available_services": { # Can still check env vars for potential availability
            "azure": bool(current_app.config.get('AZURE_SPEECH_KEY') and current_app.config.get('AZURE_REGION')),
            "deepl": bool(current_app.config.get('DEEPL_API_KEY'))
        }
    })

# Remove the old simple_translation function if it exists
# def simple_translation(text, target_language):
#     ...