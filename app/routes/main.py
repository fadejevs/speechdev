from flask import Blueprint, render_template, jsonify, current_app, request
from app.services.firebase_service import FirebaseService
import logging

# Create a Blueprint
main_bp = Blueprint('main', __name__)

firebase_service = FirebaseService()

@main_bp.route('/')
def index():
    return jsonify({'message': 'Speech API is running'})

@main_bp.route('/translate', methods=['POST'])
def translate_text():
    """Super simple translation endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        text = data.get('text', '')
        source_language = data.get('source_language', 'auto')
        target_language = data.get('target_language', 'en')
        
        logging.info(f"Translation request: '{text}' from {source_language} to {target_language}")
        
        # Simple mock translations
        translations = {
            'lv': {
                'test': 'tests',
                'testing': 'testēšana',
                'hello': 'sveiki',
                'world': 'pasaule',
                'thank you': 'paldies',
                'goodbye': 'uz redzēšanos'
            }
        }
        
        # Get target language code without region
        target_code = target_language.split('-')[0].lower()
        
        # Check if we have translations for this language
        if target_code in translations:
            # Check if we have a translation for this text
            lower_text = text.lower()
            for eng, trans in translations[target_code].items():
                if eng in lower_text:
                    return jsonify({
                        'translated_text': trans,
                        'source_language': source_language,
                        'target_language': target_language
                    })
        
        # Default fallback translation
        return jsonify({
            'translated_text': f"[{target_language}] {text}",
            'source_language': source_language,
            'target_language': target_language
        })
        
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        # Even on error, return a valid response
        return jsonify({
            'translated_text': f"[Translation error]",
            'source_language': source_language if 'source_language' in locals() else 'unknown',
            'target_language': target_language if 'target_language' in locals() else 'unknown'
        })

@main_bp.route('/api/transcripts', methods=['GET'])
def get_transcripts():
    try:
        transcripts = firebase_service.get_transcripts(limit=20)
        return jsonify(transcripts), 200
    except Exception as e:
        current_app.logger.error(f"Error getting transcripts: {e}")
        return jsonify({'error': str(e)}), 500 