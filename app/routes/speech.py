from flask import request, jsonify
import os
from app import app
from app.services.speech_service import SpeechService
from app.services.firebase_service import FirebaseService

speech_service = SpeechService()
firebase_service = FirebaseService()

@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        temp_path = 'temp_audio.wav'
        file.save(temp_path)
        
        text = speech_service.recognize_speech(temp_path)
    
        os.remove(temp_path)
        
        if text:
            transcript_id = firebase_service.store_transcript(
                text=text,
                transcript_type='stt'
            )
            return jsonify({
                'text': text,
                'transcript_id': transcript_id
            }), 200
        else:
            return jsonify({'error': 'Could not recognize speech'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 