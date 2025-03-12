from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret123'  # Can be any random string
socketio = SocketIO(app, cors_allowed_origins="*")

AZURE_SPEECH_KEY = "YOUR_AZURE_SPEECH_KEY"
AZURE_REGION = "YOUR_AZURE_REGION"

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
