from flask import Blueprint, request, jsonify, current_app
import logging
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
from werkzeug.utils import secure_filename
import os
import requests
from app.utils.translation import simple_translation

# Configure logging
logging.basicConfig(level=logging.DEBUG)

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
    # Use current_app to access the application context and its config
    speech_key = current_app.config.get('AZURE_SPEECH_KEY')
    speech_region = current_app.config.get('AZURE_REGION')
    # --- End change ---

    logging.debug("--- Request Headers ---:\n%s", request.headers)
    logging.debug("--- Request Files ---: %s", request.files)

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
            upload_ext = os.path.splitext(original_filename)[1] or ".bin"
            if upload_ext == ".bin": upload_ext = ".webm"

        upload_path = UPLOAD_TEMP_FILENAME + upload_ext
        logging.debug(f"Attempting to save uploaded file to: {upload_path} (Mimetype: {mimetype})")
        file.save(upload_path)
        logging.debug(f"Uploaded file saved successfully to: {upload_path}")

        # Convert the uploaded file to WAV using pydub
        logging.debug(f"Attempting to convert {upload_path} to {converted_path}")
        audio = AudioSegment.from_file(upload_path)
        audio.export(converted_path, format="wav")
        logging.debug(f"File successfully converted to WAV: {converted_path}")

        # --- Azure Speech Recognition using the CONVERTED file ---
        logging.debug("Attempting speech recognition with converted WAV...")

        # --- Use the variables loaded from config ---
        logging.debug(f"Using SPEECH_KEY: {'*' * (len(speech_key) - 4) + speech_key[-4:] if speech_key else 'Not Set in Config'}")
        logging.debug(f"Using SPEECH_REGION: {speech_region if speech_region else 'Not Set in Config'}")

        # Check if keys were actually loaded from config
        if not speech_key or not speech_region:
             logging.error("AZURE_SPEECH_KEY or AZURE_REGION not found in Flask config (config.py).")
             return jsonify({"error": "Server configuration error: Missing Azure credentials in config."}), 500

        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)

        # --- Use a valid BCP-47 default language code ---
        source_language = request.form.get('language', 'en-US') # Default to en-US
        speech_config.speech_recognition_language = source_language
        logging.debug(f"Using source language: {source_language}")

        audio_config = speechsdk.audio.AudioConfig(filename=converted_path)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

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
        logging.exception("Error during speech recognition process:")
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

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
    """Translate text from one language to another using DeepL"""
    try:
        # Check if DeepL API key is configured
        if not DEEPL_API_KEY:
            logging.warning("DeepL API key not configured, using fallback translation")
            translated_text = simple_translation(text, target_language)
            return jsonify({
                'translated_text': translated_text,
                'source_language': source_language,
                'target_language': target_language
            })
            
        data = request.get_json()
        logging.info(f"Translation request data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        text = data.get('text')
        source_language = data.get('source_language')
        target_language = data.get('target_language')
        
        logging.info(f"Translating: '{text}' from {source_language} to {target_language}")
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        if not target_language:
            return jsonify({'error': 'No target language provided'}), 400
        
        # Convert language codes to format expected by DeepL
        # DeepL uses two-letter codes like 'EN', 'DE', etc.
        source_lang = source_language.split('-')[0].upper() if source_language else None
        target_lang = target_language.split('-')[0].upper()
        
        # Map some language codes that might be different
        lang_map = {
            'LV': 'LV',  # Latvian
            'EN': 'EN',  # English
            'ES': 'ES',  # Spanish
            'FR': 'FR',  # French
            'DE': 'DE',  # German
            'IT': 'IT',  # Italian
            'JA': 'JA',  # Japanese
            'ZH': 'ZH',  # Chinese
        }
        
        target_lang = lang_map.get(target_lang, target_lang)
        if source_lang:
            source_lang = lang_map.get(source_lang, source_lang)
        
        # Prepare request to DeepL API
        payload = {
            'text': [text],
            'target_lang': target_lang,
            'auth_key': DEEPL_API_KEY
        }
        
        # Add source language if provided
        if source_lang:
            payload['source_lang'] = source_lang
            
        logging.info(f"Sending request to DeepL API: {payload}")
        
        # Make request to DeepL API
        response = requests.post(DEEPL_API_URL, data=payload)
        
        # Log the response for debugging
        logging.info(f"DeepL API response status: {response.status_code}")
        logging.info(f"DeepL API response content: {response.text}")
        
        response.raise_for_status()  # Raise exception for HTTP errors
        
        translation_data = response.json()
        logging.info(f"DeepL API response JSON: {translation_data}")
        
        # Extract translated text from DeepL response
        translated_text = translation_data['translations'][0]['text']
        
        return jsonify({
            'translated_text': translated_text,
            'source_language': source_language,
            'target_language': target_language
        })
        
    except requests.exceptions.RequestException as e:
        logging.error(f"DeepL API error: {str(e)}")
        return jsonify({'error': f"DeepL API error: {str(e)}"}), 500
    except KeyError as e:
        logging.error(f"Unexpected DeepL API response format: {str(e)}")
        return jsonify({'error': f"Unexpected DeepL API response format: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Error translating text: {str(e)}")
        return jsonify({'error': str(e)}), 500 