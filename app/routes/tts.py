from flask import request, jsonify, send_file
import os
from app import app
from app.services.speech_service import SpeechService

speech_service = SpeechService()

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        text = data.get('text')
        voice = data.get('voice', 'en-US-JennyNeural')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        output_file = "output_audio.wav"
        
        success = speech_service.synthesize_speech(text, output_file, voice)
        
        if success:
            return send_file(output_file, mimetype="audio/wav", as_attachment=True)
        else:
            return jsonify({'error': 'Speech synthesis failed'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
