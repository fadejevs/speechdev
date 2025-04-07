from flask_socketio import emit
from flask import request
from app import socketio
import time
import logging
from app.services.translation_service import TranslationService  # Import your existing service

# Create an instance of your translation service
translation_service = TranslationService()

@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")
    emit('connection_response', {'data': 'Connected!'})

@socketio.on('disconnect')
def handle_disconnect():
    logging.info(f"Client disconnected: {request.sid}")

@socketio.on('test_delay')
def handle_test_delay(data):
    print('Starting delay test...')
    emit('delay_update', {'message': 'Starting 5 second delay test...'})
    
    # 5 sec delay
    time.sleep(5)
    
    # completed
    emit('delay_update', {'message': 'Delay test completed!'})

@socketio.on('message')
def handle_message(data):
    print('Received message:', data)

@socketio.on('translate_text')
def handle_translation(data):
    """
    Handle translation requests via WebSocket
    Expected data format:
    {
        "text": "Text to translate",
        "source_language": "en-US",
        "target_languages": ["lv-LV", "de-DE", ...]
    }
    """
    logging.info(f"Received translation request: {data}")
    
    try:
        text = data.get('text')
        source_language = data.get('source_language')
        target_languages = data.get('target_languages', [])
        
        if not text or not source_language or not target_languages:
            logging.error("Missing required translation parameters")
            emit('translation_error', {'error': 'Missing required parameters'})
            return
        
        # Process each target language
        for target_language in target_languages:
            try:
                # Extract language codes without region if needed
                source_lang = source_language.split('-')[0] if '-' in source_language else source_language
                target_lang = target_language.split('-')[0] if '-' in target_language else target_language
                
                # Call your existing translation service
                translated_text = translation_service.translate(text, source_lang, target_lang)
                
                if translated_text:
                    # Emit the result back to the client
                    emit('translation_result', {
                        'source_language': source_language,
                        'target_language': target_language,
                        'original_text': text,
                        'translated_text': translated_text
                    })
                    
                    logging.info(f"Sent translation to {target_language}: {translated_text[:30]}...")
                else:
                    emit('translation_error', {
                        'target_language': target_language,
                        'error': 'Translation service returned empty result'
                    })
                
            except Exception as e:
                logging.error(f"Error translating to {target_language}: {str(e)}")
                emit('translation_error', {
                    'target_language': target_language,
                    'error': str(e)
                })
    
    except Exception as e:
        logging.error(f"Error processing translation request: {str(e)}")
        emit('translation_error', {'error': str(e)}) 