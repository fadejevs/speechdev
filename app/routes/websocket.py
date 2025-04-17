import logging
import os
import base64
import threading
import azure.cognitiveservices.speech as speechsdk
from flask import request
from flask_socketio import emit

from app import socketio
from app.services.translation_service import TranslationService

# Basic setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple global state
active_sessions = {}
session_lock = threading.Lock()

@socketio.on('connect')
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_success', {'message': 'Connected successfully'})

@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")
    stop_session(sid)

@socketio.on('start_translation')
def on_start_translation(data):
    """Start a simple translation session"""
    sid = request.sid
    source_language = data.get('source_language', 'en-US')
    target_language = data.get('target_language', 'es')  # Default to Spanish if not specified
    
    logger.info(f"Starting translation for {sid}: {source_language} → {target_language}")
    
    # Stop any existing session
    stop_session(sid)
    
    try:
        # 1. Setup DeepL
        deepl_api_key = os.environ.get("DEEPL_API_KEY")
        translation_service = TranslationService(api_key=deepl_api_key)
        
        # 2. Setup Azure Speech
        azure_key = os.environ.get("AZURE_SPEECH_KEY")
        azure_region = os.environ.get("AZURE_SPEECH_REGION")
        
        # 3. Create audio stream
        stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=stream)
        
        # 4. Create speech config
        speech_config = speechsdk.SpeechConfig(subscription=azure_key, region=azure_region)
        speech_config.speech_recognition_language = source_language
        
        # 5. Create recognizer
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
        
        # 6. Setup callback for recognized speech
        def recognized_cb(evt):
            if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
                text = evt.result.text
                logger.info(f"Recognized: {text}")
                
                # Translate with DeepL
                try:
                    translated = translation_service.translate(text, target_language, source_language.split('-')[0])
                    logger.info(f"Translated: {translated}")
                    
                    # Send result to client
                    socketio.emit('translation_result', {
                        'original': text,
                        'translated': translated,
                        'source_language': source_language,
                        'target_language': target_language
                    }, room=sid)
                except Exception as e:
                    logger.error(f"Translation error: {e}")
                    socketio.emit('error', {'message': f'Translation error: {str(e)}'}, room=sid)
        
        # Connect callback and start recognition
        recognizer.recognized.connect(recognized_cb)
        recognizer.start_continuous_recognition_async()
        
        # Store session
        with session_lock:
            active_sessions[sid] = {
                'recognizer': recognizer,
                'stream': stream,
                'translation_service': translation_service
            }
        
        emit('translation_started', {'message': 'Ready to translate'})
        
    except Exception as e:
        logger.error(f"Setup error: {e}")
        emit('error', {'message': f'Setup error: {str(e)}'})

@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Process incoming audio"""
    sid = request.sid
    
    with session_lock:
        session = active_sessions.get(sid)
    
    if not session or not session.get('stream'):
        return
    
    try:
        # Handle different audio formats
        if isinstance(data, bytes):
            audio_bytes = data
        elif isinstance(data, str):
            audio_bytes = base64.b64decode(data)
        elif isinstance(data, dict) and 'audio_chunk' in data:
            chunk = data['audio_chunk']
            if isinstance(chunk, bytes):
                audio_bytes = chunk
            else:
                audio_bytes = base64.b64decode(chunk)
        else:
            return
        
        # Write to stream
        session['stream'].write(audio_bytes)
        
    except Exception as e:
        logger.error(f"Audio processing error: {e}")

@socketio.on('stop_translation')
def on_stop_translation():
    """Stop the translation session"""
    sid = request.sid
    if stop_session(sid):
        emit('translation_stopped', {'message': 'Translation stopped'})

def stop_session(sid):
    """Stop and clean up a session"""
    with session_lock:
        if sid in active_sessions:
            session = active_sessions[sid]
            
            # Stop recognizer
            if 'recognizer' in session:
                try:
                    session['recognizer'].stop_continuous_recognition_async()
                except:
                    pass
            
            # Close stream
            if 'stream' in session:
                try:
                    session['stream'].close()
                except:
                    pass
            
            # Remove session
            del active_sessions[sid]
            return True
    return False