from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from app.services.speech_service import SpeechService
from app.services.firebase_service import FirebaseService
from app.services.translation_service import TranslationService

app = Flask(__name__)
CORS(app)

# Initialize services
speech_service = SpeechService()
firebase_service = FirebaseService()
translation_service = TranslationService()

@app.route('/api/speech/recognize', methods=['POST'])
def recognize_speech():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    source_language = request.form.get('source_language', 'en')
    
    # Save the audio file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        audio_file.save(temp_file.name)
        temp_filename = temp_file.name
    
    try:
        # Recognize speech
        text = speech_service.recognize_speech(temp_filename)
        
        if not text:
            return jsonify({'error': 'Could not recognize speech'}), 400
        
        # Store in Firebase
        firebase_service.store_transcript(text, 'stt', source_language)
        
        return jsonify({'text': text, 'language': source_language})
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.route('/api/translate', methods=['POST'])
def translate_text():
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    source_language = data.get('source_language', 'en')
    target_language = data.get('target_language', 'fr')
    
    # Translate the text
    translated_text = translation_service.translate(text, source_language, target_language)
    
    if not translated_text:
        return jsonify({'error': 'Translation failed'}), 400
    
    # Store in Firebase
    firebase_service.store_transcript(
        text, 
        'translation', 
        source_language, 
        translated_text, 
        target_language
    )
    
    return jsonify({
        'original_text': text,
        'translated_text': translated_text,
        'source_language': source_language,
        'target_language': target_language
    })

@app.route('/api/speech/synthesize', methods=['POST'])
def synthesize_speech():
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    language = data.get('language', 'en')
    
    # Map language code to voice name
    voice_map = {
        'en': 'en-US-JennyNeural',
        'fr': 'fr-FR-DeniseNeural',
        'es': 'es-ES-ElviraNeural',
        'de': 'de-DE-KatjaNeural',
        'lv': 'lv-LV-EveritaNeural',
        'lt': 'lt-LT-OnaNeural',
        'et': 'et-EE-AnuNeural',
        'ru': 'ru-RU-SvetlanaNeural'
    }
    
    voice = voice_map.get(language, 'en-US-JennyNeural')
    
    # Create a temporary file for the audio output
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        output_file = temp_file.name
    
    try:
        # Synthesize speech
        success = speech_service.synthesize_speech(text, output_file, voice)
        
        if not success:
            return jsonify({'error': 'Speech synthesis failed'}), 400
        
        # Return the audio file
        return send_file(output_file, mimetype='audio/wav')
    finally:
        # Clean up will happen when the file is sent
        pass

@app.route('/api/transcripts', methods=['GET', 'POST'])
def handle_transcripts():
    if request.method == 'GET':
        # Get transcripts
        limit = request.args.get('limit', 10, type=int)
        transcripts = firebase_service.get_transcripts(limit)
        return jsonify(transcripts)
    
    elif request.method == 'POST':
        # Store a new transcript
        data = request.json
        
        if not data or 'original_text' not in data:
            return jsonify({'error': 'Invalid transcript data'}), 400
        
        transcript_id = firebase_service.store_transcript(
            data['original_text'],
            data.get('type', 'translation'),
            data.get('source_language', 'en'),
            data.get('translated_text'),
            data.get('target_language')
        )
        
        return jsonify({'id': transcript_id, 'status': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 