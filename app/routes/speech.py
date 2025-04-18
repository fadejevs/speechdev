from flask import Blueprint, request, jsonify, current_app
import logging
# import azure.cognitiveservices.speech as speechsdk # Not needed if using SpeechService
from pydub import AudioSegment
from werkzeug.utils import secure_filename
import os
# import requests # Not needed if using TranslationService
import tempfile # For temporary file handling
import json # To parse target languages

# Remove the direct import of translation module if not used elsewhere
# from app.routes.translation import simple_translation

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Rename bp to speech_bp to match the import in __init__.py
speech_bp = Blueprint('speech', __name__)

# Define temporary file paths (Consider making these configurable)
UPLOAD_TEMP_DIR = "temp_audio" # Use a directory
if not os.path.exists(UPLOAD_TEMP_DIR):
    os.makedirs(UPLOAD_TEMP_DIR)
# UPLOAD_TEMP_FILENAME = "temp_upload_audio" # Filenames will be dynamic
# CONVERTED_WAV_FILENAME = "temp_converted.wav" # Filenames will be dynamic

# Remove direct key access - use services initialized with app.config
# DEEPL_API_KEY = os.environ.get('DEEPL_API_KEY')
# DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"

# Configure logger for this blueprint
logger = logging.getLogger(__name__)

@speech_bp.route('/recognize', methods=['POST'])
def recognize_speech_route():
    logger.warning("Deprecated /recognize endpoint called.")
    return jsonify({"error": "This endpoint might be deprecated. Use /transcribe-and-translate"}), 404

@speech_bp.route('/synthesize', methods=['POST'])
def synthesize_speech_route():
    logger.warning("Deprecated /synthesize endpoint called.")
    return jsonify({"error": "This endpoint might be deprecated."}), 404

@speech_bp.route('/transcribe-and-translate', methods=['POST'])
def transcribe_and_translate_audio():
    logger.info("Received request for /transcribe-and-translate")

    # Access services
    speech_service = current_app.speech_service
    translation_service = current_app.translation_service

    # --- CORRECTED CHECK ---
    # Check if the service object exists and has the necessary config attributes
    if not speech_service or not getattr(speech_service, 'azure_key', None) or not getattr(speech_service, 'azure_region', None):
         logger.error("Speech service not available or not configured (missing key or region).")
         # Return 503 Service Unavailable, as the service required isn't ready
         return jsonify({"error": "Speech service not configured"}), 503
    # --- END CORRECTED CHECK ---

    if not translation_service or not translation_service.service_type:
        logger.error("Translation service not available or not configured.")
        return jsonify({"error": "Translation service not configured"}), 503

    # --- File and Form Data Handling ---
    if 'audio' not in request.files:
        logger.error("No audio file part in the request")
        return jsonify({"error": "No audio file part"}), 400

    file = request.files['audio']
    source_language = request.form.get('source_language')
    target_languages_json = request.form.get('target_languages', '[]') # Expecting a JSON string array

    if not file or file.filename == '':
        logger.error("No selected audio file")
        return jsonify({"error": "No selected file"}), 400

    if not source_language:
        logger.error("Missing 'source_language' in form data")
        return jsonify({"error": "Missing 'source_language'"}), 400

    try:
        target_languages = json.loads(target_languages_json)
        if not isinstance(target_languages, list):
            raise ValueError("target_languages should be a list")
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Invalid 'target_languages' format: {e}. Expected a JSON list string.")
        return jsonify({"error": f"Invalid 'target_languages' format: {e}"}), 400

    filename = secure_filename(file.filename or 'audio.upload')
    upload_path = os.path.join(UPLOAD_TEMP_DIR, f"upload_{filename}")
    wav_path = os.path.join(UPLOAD_TEMP_DIR, f"converted_{os.path.splitext(filename)[0]}.wav")

    try:
        # --- Save and Convert Audio ---
        logger.info(f"Saving uploaded file to: {upload_path}")
        file.save(upload_path)
        logger.info(f"Attempting to convert {upload_path} to WAV format at {wav_path}")
        try:
            audio = AudioSegment.from_file(upload_path)
            # Optional: Add parameters like frame_rate, channels if needed by Azure
            audio.export(wav_path, format="wav")
            logger.info(f"Audio successfully converted to WAV: {wav_path}")
        except Exception as e:
            logger.error(f"Error converting audio file: {e}", exc_info=True)
            # Clean up upload before returning
            if os.path.exists(upload_path): os.remove(upload_path)
            return jsonify({"error": f"Audio conversion failed: {e}"}), 500

        # --- Speech Recognition ---
        logger.info(f"Starting speech recognition for language: {source_language} using file: {wav_path}")
        recognized_text = speech_service.recognize_speech(wav_path, source_language) # Pass language if needed by service

        if recognized_text is None: # Check if service returns None on failure
            logger.warning("Speech recognition did not return text.")
            # Return an empty result or specific error? Let's return empty for now.
            return jsonify({"original": None, "translations": {}, "error": "Speech could not be recognized"}), 200 # Use 200 OK but indicate no match

        logger.info(f"Recognition successful: '{recognized_text}'")

        # --- Translation ---
        translations = {}
        if recognized_text and target_languages:
            logger.info(f"Translating '{recognized_text[:50]}...' from {source_language} to {target_languages}")
            for target_lang in target_languages:
                 try:
                     translated = translation_service.translate(recognized_text, source_language, target_lang)
                     if translated:
                         translations[target_lang] = translated
                         logger.info(f"Translated to {target_lang}: '{translated[:50]}...'")
                     else:
                         logger.warning(f"Translation to {target_lang} returned empty or None.")
                         translations[target_lang] = "[Translation unavailable]" # Or some placeholder

                 except Exception as e:
                     logger.error(f"Error translating to {target_lang}: {e}", exc_info=True)
                     translations[target_lang] = f"[Translation Error: {e}]"

        # --- Return Combined Result ---
        response_data = {
            "original": recognized_text,
            "translations": translations
        }
        logger.info(f"Returning response: {response_data}")
        return jsonify(response_data)

    except Exception as e:
        # Generic catch-all for unexpected errors in the route logic itself
        logger.error(f"Unexpected error during transcribe/translate processing: {e}", exc_info=True)
        # Ensure cleanup happens even with unexpected errors
        # Note: The finally block below handles cleanup more reliably
        return jsonify({"error": "An unexpected server error occurred"}), 500
    finally:
        # --- Cleanup Temporary Files ---
        # This block ensures cleanup happens whether the try block succeeded or failed
        try:
            if 'upload_path' in locals() and os.path.exists(upload_path):
                os.remove(upload_path)
                logger.debug(f"Cleaned up temporary file: {upload_path}")
            if 'wav_path' in locals() and os.path.exists(wav_path):
                os.remove(wav_path)
                logger.debug(f"Cleaned up temporary file: {wav_path}")
        except Exception as e:
            logger.error(f"Error cleaning up temporary files: {e}")

# Refactored /translate route using TranslationService
@speech_bp.route('/translate', methods=['POST'])
def translate_text_route():
    """Translation endpoint using the TranslationService."""
    translation_service = current_app.translation_service
    if not translation_service or not translation_service.service_type:
        logger.error("Translation service not available or not configured.")
        return jsonify({"error": "Translation service not configured"}), 503

    data = request.get_json()
    if not data or 'text' not in data or 'target_language' not in data:
        logger.error("Missing 'text' or 'target_language' in translation request.")
        return jsonify({"error": "Missing 'text' or 'target_language'"}), 400

    text = data['text']
    target_language = data['target_language']
    # Source language is often optional, let the service handle 'auto' or default
    source_language = data.get('source_language', 'auto') # Default to auto-detect

    logger.info(f"Received translation request: '{text[:50]}...' from '{source_language}' to '{target_language}'")

    try:
        # Use the translate method from the service
        # Note: The existing TranslationService.translate method needs review/update
        # based on the code provided earlier, it calls internal _translate_deepl/_translate_azure
        # Ensure that method handles source/target languages correctly.
        # Assuming translate_text exists and works as intended:
        translated_text = translation_service.translate_text(text, target_language) # Assuming translate_text takes text and target_lang

        # Check if the result indicates an error (service methods should return None or raise exceptions on failure)
        if translated_text and not translated_text.startswith("Error:"):
             logger.info(f"Translation successful via {translation_service.service_type}: '{translated_text[:50]}...'")
             # The service might not easily return detected source lang, depends on implementation
             return jsonify({
                 'translated_text': translated_text,
                 'source_language': source_language, # Or detected lang if service returns it
                 'target_language': target_language
             })
        else:
             logger.error(f"Translation failed using {translation_service.service_type}. Result: {translated_text}")
             # Provide a generic error or the specific one from the service if available
             error_message = translated_text if translated_text else "Translation failed"
             return jsonify({"error": error_message}), 500 # Or 503 if service unavailable

    except Exception as e:
        logger.error(f"Error during translation request: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred during translation"}), 500

# Remove the old simple_translation function if it's no longer needed
# def simple_translation(text, target_language):
#     ... 