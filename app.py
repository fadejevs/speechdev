from flask import Flask, request, jsonify
import os

app = Flask(__name__)

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

if __name__ == '__main__':
    app.run(debug=True, port=5001)
