from flask import Blueprint, request, jsonify, current_app
import logging
# import azure.cognitiveservices.speech as speechsdk # Not needed if using SpeechService
from pydub import AudioSegment
from werkzeug.utils import secure_filename
import os
# import requests # Not needed if using TranslationService

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

@speech_bp.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    # Access the initialized SpeechService
    speech_service = current_app.speech_service
    if not speech_service or not speech_service.speech_config:
         logging.error("Speech service not available or not configured.")
         return jsonify({"error": "Speech service not configured"}), 503 # Service Unavailable

    logging.info("--- Starting speech-to-text processing ---")
    logging.debug("--- Request Headers ---:\n%s", request.headers)
    logging.debug("--- Request Form Data ---: %s", request.form)
    logging.debug("--- Request Files ---: %s", request.files)
    
    # Azure's officially supported language codes
    # Source: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support
    language_map = {
        "English": "en-US",
        "Spanish": "es-ES",
        "Latvian": "lv-LV",
        "German": "de-DE",
        "French": "fr-FR",
        # Add more as needed
    }
    
    # Get language from request
    language = request.form.get('language', 'en-US')
    logging.info(f"Received language parameter: '{language}'")
    
    # Convert full language name to code if needed
    if language in language_map:
        language_code = language_map[language]
        logging.info(f"Mapped language '{language}' to code '{language_code}'")
    else:
        # If it's already a code or unknown, use as is or default to en-US
        if '-' in language:  # Looks like a language code
            language_code = language
        else:
            language_code = "en-US"  # Default to English if unknown
            logging.warning(f"Unknown language '{language}', defaulting to '{language_code}'")
    
    logging.info(f"Using language code for Azure: '{language_code}'")

    if 'audio' not in request.files:
        logging.error("No audio file part in the request")
        return jsonify({"error": "No audio file part"}), 400

    file = request.files['audio']

    if file.filename == '':
        logging.error("No selected file")
        return jsonify({"error": "No selected file"}), 400

    if file:
        original_filename = secure_filename(file.filename)
        # Create unique temp filenames
        base_name = os.path.splitext(original_filename)[0] + "_" + str(os.urandom(4).hex())
        upload_path = os.path.join(UPLOAD_TEMP_DIR, base_name + "_upload")
        wav_path = os.path.join(UPLOAD_TEMP_DIR, base_name + "_converted.wav")

        try:
            file.save(upload_path)
            logging.info(f"Audio file saved temporarily to: {upload_path}")

            # --- Audio Conversion (using Pydub) ---
            logging.info("Attempting to convert audio to WAV format...")
            try:
                audio = AudioSegment.from_file(upload_path)
                # Ensure mono, 16kHz, 16-bit PCM WAV for Azure SDK
                audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
                audio.export(wav_path, format="wav")
                logging.info(f"Audio successfully converted to WAV: {wav_path}")
            except Exception as e:
                logging.error(f"Error converting audio file: {e}", exc_info=True)
                return jsonify({"error": f"Audio conversion failed: {e}"}), 500

            # --- Speech Recognition using SpeechService ---
            logging.info("Starting speech recognition using SpeechService...")
            # TODO: Update recognize_speech in SpeechService if it needs the language code
            recognized_text = speech_service.recognize_speech(wav_path)

            if recognized_text:
                logging.info(f"Recognition successful: '{recognized_text}'")
                return jsonify({"transcription": recognized_text})
            else:
                # Error/NoMatch logging is handled within recognize_speech
                logging.warning("Speech recognition did not return text.")
                # Return specific error based on logs if needed, otherwise generic
                return jsonify({"error": "Speech could not be recognized"}), 400 # Or 500 if service failed

        except Exception as e:
             # Catch any unexpected errors during file handling or service call
             logging.error(f"Unexpected error during speech-to-text processing: {e}", exc_info=True)
             return jsonify({"error": "An unexpected error occurred"}), 500
        finally:
            # --- Cleanup Temporary Files ---
            try:
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                    logging.debug(f"Cleaned up temporary file: {upload_path}")
                if os.path.exists(wav_path):
                    os.remove(wav_path)
                    logging.debug(f"Cleaned up temporary file: {wav_path}")
            except Exception as e:
                logging.error(f"Error cleaning up temporary files: {e}")
    else:
         # This case should be caught by 'if file:' check, but as a safeguard
         logging.error("File object was unexpectedly empty.")
         return jsonify({"error": "File processing error"}), 500


# Refactored /translate route using TranslationService
@speech_bp.route('/translate', methods=['POST'])
def translate_text_route():
    """Translation endpoint using the TranslationService."""
    translation_service = current_app.translation_service
    if not translation_service or not translation_service.service_type:
        logging.error("Translation service not available or not configured.")
        return jsonify({"error": "Translation service not configured"}), 503

    data = request.get_json()
    if not data or 'text' not in data or 'target_language' not in data:
        logging.error("Missing 'text' or 'target_language' in translation request.")
        return jsonify({"error": "Missing 'text' or 'target_language'"}), 400

    text = data['text']
    target_language = data['target_language']
    # Source language is often optional, let the service handle 'auto' or default
    source_language = data.get('source_language', 'auto') # Default to auto-detect

    logging.info(f"Received translation request: '{text[:50]}...' from '{source_language}' to '{target_language}'")

    try:
        # Use the translate method from the service
        # Note: The existing TranslationService.translate method needs review/update
        # based on the code provided earlier, it calls internal _translate_deepl/_translate_azure
        # Ensure that method handles source/target languages correctly.
        # Assuming translate_text exists and works as intended:
        translated_text = translation_service.translate_text(text, target_language) # Assuming translate_text takes text and target_lang

        # Check if the result indicates an error (service methods should return None or raise exceptions on failure)
        if translated_text and not translated_text.startswith("Error:"):
             logging.info(f"Translation successful via {translation_service.service_type}: '{translated_text[:50]}...'")
             # The service might not easily return detected source lang, depends on implementation
             return jsonify({
                 'translated_text': translated_text,
                 'source_language': source_language, # Or detected lang if service returns it
                 'target_language': target_language
             })
        else:
             logging.error(f"Translation failed using {translation_service.service_type}. Result: {translated_text}")
             # Provide a generic error or the specific one from the service if available
             error_message = translated_text if translated_text else "Translation failed"
             return jsonify({"error": error_message}), 500 # Or 503 if service unavailable

    except Exception as e:
        logging.error(f"Error during translation request: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred during translation"}), 500

# Remove the old simple_translation function if it's no longer needed
# def simple_translation(text, target_language):
#     ... 