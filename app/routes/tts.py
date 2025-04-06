from flask import Blueprint, request, jsonify, send_file, current_app
import os
# from app import app # REMOVE THIS LINE
from app.services.speech_service import SpeechService

# Create a Blueprint
tts_bp = Blueprint('tts', __name__)

speech_service = SpeechService()

@tts_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        text = data.get('text')
        voice = data.get('voice', 'en-US-JennyNeural')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        # --- Consider a dedicated upload/temp folder ---
        # Using relative paths like this can be fragile.
        # Better: Define an UPLOAD_FOLDER in config and use that.
        # output_dir = current_app.config.get('UPLOAD_FOLDER', './temp_audio')
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "temp_audio") # Example: temp_audio in root
        output_file = os.path.join(output_dir, "output_audio.wav")
        # --- End folder consideration ---
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        success = speech_service.synthesize_speech(text, output_file, voice)
        
        if success:
            # Important: Ensure the file is closed before sending if synthesize_speech doesn't handle it.
            # send_file handles cleanup well in most cases.
            return send_file(output_file, mimetype="audio/wav", as_attachment=False) # as_attachment=False to play in browser?
        else:
            return jsonify({'error': 'Speech synthesis failed'}), 500 # Use 500 for server-side failure
            
    except Exception as e:
        current_app.logger.error(f"TTS error: {e}")
        return jsonify({'error': str(e)}), 500
    # finally:
        # Optional: Clean up the generated file if needed, though send_file might handle it.
        # if os.path.exists(output_file):
        #     os.remove(output_file)
