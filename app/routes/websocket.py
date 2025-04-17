import logging
import os
import base64
import threading
import azure.cognitiveservices.speech as speechsdk
from flask import request, current_app
from flask_socketio import emit

from app import socketio

# Basic setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple global state for active WebSocket sessions
active_sessions = {}
session_lock = threading.Lock()

@socketio.on('connect')
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_success', {'message': 'Connected successfully'})

@socketio.on('disconnect')
def on_disconnect():
    logger.info(f"Client disconnected: {request.sid}")
    stop_session(request.sid)

@socketio.on('start_recognition')
def on_start_recognition(data):
    """Start a simple recognition and translation session"""
    sid = request.sid
    room_id = data.get('room_id')
    source_language = data.get('source_language', 'en-US')
    target_languages = data.get('target_languages', ['es'])

    target_language = target_languages[0] if target_languages else 'es'

    logger.info(f"[{sid}] Starting recognition in room '{room_id}': {source_language} -> {target_language}")

    stop_session(sid)

    try:
        # --- Get services initialized by the app factory ---
        try:
            translation_service = current_app.translation_service
            if not translation_service or not translation_service.service_type:
                 logger.error(f"[{sid}] Translation service not available or not configured via app factory.")
                 emit('error', {'message': 'Translation service not configured on server.'})
                 return

            azure_key = current_app.config.get("AZURE_SPEECH_KEY")
            azure_region = current_app.config.get("AZURE_REGION")
            if not azure_key or not azure_region:
                 logger.error(f"[{sid}] Azure Speech credentials not configured via app factory.")
                 emit('error', {'message': 'Azure Speech service not configured on server.'})
                 return

        except AttributeError:
             logger.error(f"[{sid}] Failed to access services (translation_service?) from current_app. Check app initialization.", exc_info=True)
             emit('error', {'message': 'Server configuration error accessing services.'})
             return
        # --- End getting services ---

        stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=stream)

        speech_config = speechsdk.SpeechConfig(subscription=azure_key, region=azure_region)
        speech_config.speech_recognition_language = source_language

        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        def recognized_cb(evt: speechsdk.SpeechRecognitionEventArgs):
            """Callback for when speech is recognized"""
            result = evt.result
            text = result.text
            
            logger.info(f"[{sid}] Recognized: {text}")
            
            if not text or text.isspace():
                logger.info(f"[{sid}] Empty text recognized, skipping translation.")
                return
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logger.info(f"[{sid}] Recognized: {text}")

                try:
                    # Extract base source language code (e.g., 'en' from 'en-US')
                    base_source_lang = source_language.split('-')[0]
                    # Ensure target language is also base code if needed by service
                    base_target_lang = target_language.split('-')[0]

                    # Use base source language for translation service
                    translated = translation_service.translate(text, base_target_lang, base_source_lang)

                    if translated:
                        logger.info(f"[{sid}] Translated ({translation_service.service_type}): {translated}")
                        socketio.emit('translation_result', {
                            'original': text,
                            'translated': translated,
                            'source_language': source_language,
                            'target_language': target_language
                        }, room=sid)
                        if room_id:
                            socketio.emit('translation_result', {
                                'original': text,
                                'translated': translated,
                                'source_language': source_language,
                                'target_language': target_language
                            }, room=room_id)
                    else:
                        logger.warning(f"[{sid}] Translation returned None for text: {text}")
                        socketio.emit('translation_error', {
                             'original': text,
                             'message': f'Translation failed or returned empty using {translation_service.service_type}.',
                             'source_language': source_language,
                             'target_language': target_language
                        }, room=sid)
                except Exception as e:
                    logger.error(f"[{sid}] Translation error: {e}", exc_info=True)
                    socketio.emit('translation_error', {
                        'original': text,
                        'message': f'Translation processing error: {str(e)}',
                        'source_language': source_language,
                        'target_language': target_language
                    }, room=sid)

            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.info(f"[{sid}] No speech could be recognized: {result.no_match_details}")

        def canceled_cb(evt: speechsdk.SpeechRecognitionCanceledEventArgs):
            logger.warning(f"[{sid}] Recognition Canceled: Reason={evt.reason}")
            if evt.reason == speechsdk.CancellationReason.Error:
                logger.error(f"[{sid}] Cancellation Error Details: {evt.error_details}")
                socketio.emit('recognition_canceled', {
                    'reason': 'Error',
                    'details': evt.error_details
                }, room=sid)
            elif evt.reason == speechsdk.CancellationReason.EndOfStream:
                 logger.info(f"[{sid}] Cancellation Reason: End of stream reached.")
            else:
                 socketio.emit('recognition_canceled', {
                    'reason': str(evt.reason),
                    'details': 'Recognition session canceled.'
                 }, room=sid)
            stop_session(sid)

        def session_stopped_cb(evt: speechsdk.SessionEventArgs):
            logger.info(f'[{sid}] Recognition Session Stopped.')

        def recognizing_cb(evt):
            """Callback for when speech is being recognized (interim results)"""
            result = evt.result
            logger.info(f"[{sid}] RECOGNIZING (interim): {result.text}")

        recognizer.recognized.connect(recognized_cb)
        recognizer.canceled.connect(canceled_cb)
        recognizer.session_stopped.connect(session_stopped_cb)
        recognizer.recognizing.connect(recognizing_cb)

        recognizer.start_continuous_recognition_async()
        logger.info(f"[{sid}] Continuous recognition started.")

        logger.info(f"[{sid}] Azure Speech recognizer created with language: {source_language}")
        logger.info(f"[{sid}] Azure Speech config: {speech_config}")

        with session_lock:
            active_sessions[sid] = {
                'recognizer': recognizer,
                'stream': stream,
                'translation_service': translation_service,
                'source_language': source_language,
                'target_language': target_language
            }

        emit('recognition_started', {'message': 'Ready to recognize and translate'}, room=sid)

    except Exception as e:
        logger.error(f"[{sid}] Error during start_recognition setup: {e}", exc_info=True)
        emit('error', {'message': f'Server setup error: {str(e)}'}, room=sid)
        stop_session(sid)

@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Process an audio chunk from the client"""
    sid = request.sid
    
    logger.info(f"[{sid}] Received audio chunk")
    
    with session_lock:
        if sid not in active_sessions:
            logger.warning(f"[{sid}] Received audio chunk but no active session found.")
            return
        
        session = active_sessions[sid]
        stream = session.get('stream')
        
        if not stream:
            logger.warning(f"[{sid}] No stream in session.")
            return
    
    try:
        # Handle binary data directly
        if isinstance(data, bytes):
            audio_data = data
            logger.info(f"[{sid}] Received binary audio chunk: {len(audio_data)} bytes")
        # Handle Blob/Buffer sent by Socket.IO
        elif hasattr(data, 'read'):
            audio_data = data.read()
            logger.info(f"[{sid}] Read audio data from buffer: {len(audio_data)} bytes")
        # If it's a dictionary with metadata (your current approach)
        elif isinstance(data, dict) and 'audio' in data:
            audio_data = data['audio']
            logger.info(f"[{sid}] Extracted audio from dict: {len(audio_data)} bytes")
        else:
            logger.warning(f"[{sid}] Unrecognized audio data format: {type(data)}, data: {str(data)[:100]}")
            return
            
        # Write to the stream
        stream.write(audio_data)
        logger.info(f"[{sid}] Audio chunk written to stream: {len(audio_data)} bytes")
        
    except Exception as e:
        logger.error(f"[{sid}] Error processing audio chunk: {e}", exc_info=True)

@socketio.on('stop_recognition')
def on_stop_recognition():
    """Client explicitly requests to stop the recognition session."""
    sid = request.sid
    logger.info(f"[{sid}] Received stop_recognition request from client.")
    stop_session(sid)
    emit('recognition_stopped', {'message': 'Recognition stopped by client request.'}, room=sid)

@socketio.on('test_azure')
def on_test_azure(data):
    """Test the Azure Speech service with a simple text"""
    sid = request.sid
    source_language = data.get('source_language', 'en-US')
    target_languages = data.get('target_languages', ['es'])
    target_language = target_languages[0] if target_languages else 'es'
    
    logger.info(f"[{sid}] Testing Azure Speech with {source_language} -> {target_language}")
    
    try:
        # Get the translation service
        translation_service = current_app.translation_service
        if not translation_service:
            logger.error(f"[{sid}] Translation service not available")
            emit('error', {'message': 'Translation service not configured'})
            return
            
        # Test translation with a simple text
        test_text = "This is a test message."
        base_source_lang = 'en'  # Hardcoded for test
        base_target_lang = target_language.split('-')[0]
        
        translated = translation_service.translate(test_text, base_target_lang, base_source_lang)
        
        if translated:
            logger.info(f"[{sid}] Test translation successful: {test_text} -> {translated}")
            emit('translation_result', {
                'original': test_text,
                'translated': translated,
                'source_language': 'en-US',
                'target_language': target_language
            })
        else:
            logger.error(f"[{sid}] Test translation failed")
            emit('translation_error', {
                'original': test_text,
                'message': 'Test translation failed'
            })
    except Exception as e:
        logger.error(f"[{sid}] Test Azure error: {e}", exc_info=True)
        emit('error', {'message': f'Test error: {str(e)}'})

def stop_session(sid):
    """Stop and clean up a session"""
    logger.info(f"[{sid}] Attempting to stop session.")
    with session_lock:
        if sid in active_sessions:
            session = active_sessions.pop(sid)
            logger.info(f"[{sid}] Session found, stopping components.")

            recognizer = session.get('recognizer')
            if recognizer:
                try:
                    recognizer.recognized.disconnect_all()
                    recognizer.session_started.disconnect_all()
                    recognizer.session_stopped.disconnect_all()
                    recognizer.canceled.disconnect_all()

                    stop_future = recognizer.stop_continuous_recognition_async()
                    logger.info(f"[{sid}] Called stop_continuous_recognition_async.")
                except Exception as e:
                    logger.error(f"[{sid}] Error stopping recognizer: {e}", exc_info=True)

            stream = session.get('stream')
            if stream:
                try:
                    stream.close()
                    logger.info(f"[{sid}] Audio stream closed.")
                except Exception as e:
                    logger.error(f"[{sid}] Error closing stream: {e}", exc_info=True)

            logger.info(f"[{sid}] Session cleanup complete.")
            return True
        else:
            logger.info(f"[{sid}] No active session found to stop.")
            return False