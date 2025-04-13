from flask import Blueprint, request, jsonify, current_app
import logging
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
from werkzeug.utils import secure_filename
import os
import requests

# Import from the translation module in the same directory
from app.routes.translation import simple_translation

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Rename bp to speech_bp to match the import in __init__.py
speech_bp = Blueprint('speech', __name__)

# Define temporary file paths
UPLOAD_TEMP_FILENAME = "temp_upload_audio"
CONVERTED_WAV_FILENAME = "temp_converted.wav"

# Get DeepL API key from environment variable
DEEPL_API_KEY = os.environ.get('DEEPL_API_KEY')
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"  # Use the appropriate URL based on your subscription

@speech_bp.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    # --- Get keys from Flask app config ---
    speech_key = current_app.config.get('AZURE_SPEECH_KEY')
    speech_region = current_app.config.get('AZURE_REGION')
    
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

    if 'file' not in request.files:
        logging.warning("No file part in the request")
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        logging.warning("No selected file")
        return jsonify({"error": "No selected file"}), 400

    upload_path = None
    converted_path = CONVERTED_WAV_FILENAME
    try:
        # Save the uploaded file temporarily
        original_filename = secure_filename(file.filename or 'audio')
        mimetype = file.mimetype or ''
        if 'webm' in mimetype: upload_ext = '.webm'
        elif 'wav' in mimetype: upload_ext = '.wav'
        elif 'ogg' in mimetype: upload_ext = '.ogg'
        elif 'mpeg' in mimetype: upload_ext = '.mp3'
        else:
            upload_ext = '.audio'
            logging.warning(f"Unknown mimetype: {mimetype}, using generic extension")

        upload_path = f"{UPLOAD_TEMP_FILENAME}{upload_ext}"
        file.save(upload_path)
        logging.info(f"Saved uploaded file to {upload_path}")

        # Convert to WAV if needed
        if upload_ext != '.wav':
            logging.info(f"Converting {upload_ext} to WAV format")
            audio = AudioSegment.from_file(upload_path)
            audio.export(converted_path, format="wav")
            logging.info(f"Converted to WAV: {converted_path}")
        else:
            # If already WAV, just copy the file
            converted_path = upload_path

        # Configure speech recognition with Azure
        if not speech_key or not speech_region:
            logging.error("Azure Speech credentials not configured")
            return jsonify({"error": "Speech service not configured"}), 500

        # Configure speech recognition with the mapped language code
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
        speech_config.speech_recognition_language = language_code
        logging.info(f"Configured Azure Speech with language: '{language_code}'")

        audio_config = speechsdk.audio.AudioConfig(filename=converted_path)
        logging.info(f"Created audio config with file: {converted_path}")
        
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
        logging.info("Created speech recognizer")
        
        # Log before starting recognition
        logging.info("Starting speech recognition...")

        result = speech_recognizer.recognize_once()
        logging.debug(f"Recognition result: {result}")

        # --- Process Result ---
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            logging.info(f"Recognized: {result.text}")
            return jsonify({"transcription": result.text})
        elif result.reason == speechsdk.ResultReason.NoMatch:
            logging.warning("No speech could be recognized")
            return jsonify({"error": "No speech could be recognized"}), 400
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            logging.error(f"Speech Recognition canceled: {cancellation_details.reason}")
            error_message = f"Speech Recognition canceled: {cancellation_details.reason}" # Default message

            if cancellation_details.reason == speechsdk.CancellationReason.Error:
                logging.error(f"Error details: {cancellation_details.error_details}")
                # --- Return the actual Azure error detail ---
                error_message = f"Azure Error: {cancellation_details.error_details}"
                # --- Check specifically if it looks like an auth error based on text ---
                if "authentication" in cancellation_details.error_details.lower():
                     logging.error("Authentication failure suspected. Check Azure Speech Key and Region in config.py.")
                     error_message = "Azure authentication failed. Check server configuration."

            return jsonify({"error": error_message}), 500 # Return the detailed error message
        else:
             logging.error(f"Unexpected recognition result reason: {result.reason}")
             return jsonify({"error": "Speech recognition failed for an unknown reason"}), 500

    except Exception as e:
        logging.error(f"Error configuring Azure Speech: {str(e)}")
        return jsonify({"error": f"Azure configuration error: {str(e)}"}), 500

    finally:
        # --- Cleanup Temporary Files ---
        if upload_path and os.path.exists(upload_path):
            try:
                os.remove(upload_path)
                logging.debug(f"Temporary upload file removed: {upload_path}")
            except OSError as e:
                logging.error(f"Error removing temporary upload file {upload_path}: {e}")
        if converted_path and os.path.exists(converted_path):
            try:
                os.remove(converted_path)
                logging.debug(f"Temporary converted file removed: {converted_path}")
            except OSError as e:
                logging.error(f"Error removing temporary converted file {converted_path}: {e}")
# --- End of speech_to_text function --- 

@speech_bp.route('/translate', methods=['POST'])
def translate_text():
    """Translation endpoint that tries DeepL first, then falls back to simple translation"""
    try:
        data = request.get_json()
        
        if not data:
            logging.error("No data provided in translation request")
            return jsonify({'error': 'No data provided'}), 400
            
        text = data.get('text')
        source_language = data.get('source_language', 'auto')
        target_language = data.get('target_language')
        
        # Log the request details for debugging
        logging.info(f"Translation request received: text='{text}', source={source_language}, target={target_language}")
        
        if not text:
            logging.error("No text provided in translation request")
            return jsonify({'error': 'No text provided'}), 400
            
        if not target_language:
            logging.error("No target language provided in translation request")
            return jsonify({'error': 'No target language provided'}), 400
        
        # Try to use DeepL if available
        try:
            # Check if DeepL API key is available
            if DEEPL_API_KEY:
                logging.info("Attempting to use DeepL API for translation")
                response = requests.post(
                    DEEPL_API_URL,
                    headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                    json={
                        "text": [text],
                        "source_lang": source_language if source_language != 'auto' else None,
                        "target_lang": target_language.split('-')[0].upper()
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    translated_text = result['translations'][0]['text']
                    detected_source = result['translations'][0].get('detected_source_language', source_language)
                    
                    logging.info(f"DeepL translation successful: '{translated_text}'")
                    
                    return jsonify({
                        'translated_text': translated_text,
                        'source_language': detected_source,
                        'target_language': target_language
                    })
                else:
                    logging.warning(f"DeepL API returned status code {response.status_code}: {response.text}")
            else:
                logging.info("DeepL API key not available, using fallback translation")
        except Exception as e:
            logging.error(f"Error using DeepL API: {str(e)}")
        
        # Fallback to simple translation
        logging.info("Using fallback translation method")
        translated_text = simple_translation(text, target_language)
        
        # Log the translation result
        logging.info(f"Fallback translation result: '{translated_text}'")
        
        return jsonify({
            'translated_text': translated_text,
            'source_language': source_language,
            'target_language': target_language
        })
        
    except Exception as e:
        logging.error(f"Error in translation: {str(e)}")
        return jsonify({
            'error': f"Translation error: {str(e)}",
            'source_language': source_language if 'source_language' in locals() else 'unknown',
            'target_language': target_language if 'target_language' in locals() else 'unknown'
        }), 500 