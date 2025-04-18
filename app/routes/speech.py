from flask import Blueprint, request, jsonify, current_app
import logging
# import azure.cognitiveservices.speech as speechsdk # Not needed if using SpeechService
from pydub import AudioSegment
from werkzeug.utils import secure_filename
import os
# import requests # Not needed if using TranslationService
import tempfile # For temporary file handling
import json # To parse target languages
from .. import socketio 

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
    
    # --- Get data from request ---
    if 'audio' not in request.files:
        logger.warning("No audio file part in the request")
        return jsonify({"error": "No audio file part"}), 400
    
    file = request.files['audio']
    source_language = request.form.get('source_language')
    target_languages_str = request.form.get('target_languages', '[]')
    room_id = request.form.get('room_id') # <<< Make sure we get the room_id

    if not file or file.filename == '':
        logger.warning("No selected audio file")
        return jsonify({"error": "No selected file"}), 400
        
    if not source_language:
        logger.warning("Source language not provided")
        return jsonify({"error": "Source language is required"}), 400
        
    if not room_id: # <<< Check if room_id was provided
        logger.warning("Room ID not provided in the request")
        return jsonify({"error": "Room ID is required"}), 400

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

    try:
        target_languages = json.loads(target_languages_str)
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
        
        # Use the correct method name from the logs
        recognized_text = speech_service.recognize_speech_from_file(wav_path, source_language)
        
        if not recognized_text:
            logger.warning(f"No text recognized from audio file: {wav_path}")
            return jsonify({"error": "No speech could be recognized"}), 400
            
        logger.info(f"Recognition successful: '{recognized_text}'")

        # --- Translation ---
        logger.info(f"Translating '{recognized_text[:20]}....' from {source_language} to {target_languages}")
        
        translations = {}
        for target_language in target_languages:
            try:
                # Fix: source_language should be the source, target_language should be the target
                translated_text = translation_service.translate_text(
                    recognized_text, 
                    target_language=target_language,  # This is the target language
                    source_language=source_language   # This is the source language
                )
                logger.info(f"Translated to {target_language}: '{translated_text[:40]}...'")
                translations[target_language] = translated_text
            except Exception as e:
                logger.error(f"Error translating to {target_language}: {str(e)}")
                translations[target_language] = f"[Translation error: {str(e)}]"
        
        # --- Prepare final data ---
        final_data = {
            'original': recognized_text,
            'source_language': source_language,
            'translations': translations
        }
        
        # --- Emit result via Socket.IO ---
        logger.info(f"Emitting translation_result to room: {room_id}")
        socketio.emit('translation_result', final_data, room=room_id) # <<< THIS IS THE CRUCIAL LINE
        logger.info(f"Successfully emitted translation_result to room: {room_id}")

        # --- Return HTTP response ---
        logger.info(f"Returning HTTP response: {final_data}")
        return jsonify(final_data), 200

    except Exception as e:
        logger.exception(f"An error occurred during transcription/translation for room {room_id}: {e}")
        # Optionally emit an error event
        socketio.emit('translation_error', {'error': str(e)}, room=room_id)
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500
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