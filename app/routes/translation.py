import deepl
from flask import request, jsonify
from app import app
from app.services.firebase_service import FirebaseService

auth_key = "e7552ee8-ca29-4b47-8e86-72c21678cb0c:fx"
translator = deepl.Translator(auth_key)
firebase_service = FirebaseService()

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('target_lang', 'EN')
    
    translator = deepl.Translator(auth_key)
    result = translator.translate_text(text, target_lang=target_lang)
    
    # stores translation in firebase
    transcript_id = firebase_service.store_transcript(
        text=text,
        transcript_type='translation',
        source_lang='auto',
        translated_text=result.text,
        target_lang=target_lang
    )
    
    return jsonify({
        'translated_text': result.text,
        'transcript_id': transcript_id
    })