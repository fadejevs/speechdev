import deepl
from flask import request, jsonify
from app import app

auth_key = "e7552ee8-ca29-4b47-8e86-72c21678cb0c:fx"
translator = deepl.Translator(auth_key)

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('target_lang', 'EN')
    
    translator = deepl.Translator(auth_key)
    result = translator.translate_text(text, target_lang=target_lang)
    
    return jsonify({'translated_text': result.text})