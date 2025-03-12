from flask import request, jsonify
import os
from app import app
from azure.cognitiveservices.speech import SpeechConfig, AudioConfig, SpeechRecognizer
from app.config import AZURE_SPEECH_KEY, AZURE_REGION

@app.route('/test-speech', methods=['GET'])
def test_speech():
    try:
        file_path = os.path.join(os.getcwd(), 'speech-test.wav')
        
        speech_config = SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_REGION)
        audio_config = AudioConfig(filename=file_path)
        recognizer = SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        result = recognizer.recognize_once()
        
        if result.reason.name == 'RecognizedSpeech':
            return jsonify({'text': result.text}), 200
        else:
            return jsonify({'error': 'Could not recognize speech'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 