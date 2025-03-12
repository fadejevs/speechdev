from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import os
from datetime import datetime
from azure.cognitiveservices.speech import SpeechConfig, AudioConfig, SpeechRecognizer
from azure.cognitiveservices.speech.audio import AudioInputStream, PushAudioInputStream

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret123'
socketio = SocketIO(app, cors_allowed_origins="*")

AZURE_SPEECH_KEY = "2KK5H6hRSZk1PDQTpVQ8YM68Q3TxAcvDD7ukmxlqtx3dXoM5s3GCJQQJ99BCAC5RqLJXJ3w3AAAYACOGnzMR"
AZURE_REGION = "westeurope"


@app.route('/test-speech', methods=['GET'])
def test_speech():
    try:
        # test file
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

@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file part'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        file_path = os.path.join(os.getcwd(), 'uploaded_audio.wav')
        audio_file.save(file_path)
        return jsonify({'message': 'File received and saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connection_response', {'data': 'Connected!'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5001)