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
            result = evt.result
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                text = result.text
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

        recognizer.recognized.connect(recognized_cb)
        recognizer.canceled.connect(canceled_cb)
        recognizer.session_stopped.connect(session_stopped_cb)

        recognizer.start_continuous_recognition_async()
        logger.info(f"[{sid}] Continuous recognition started.")

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
    """Process incoming audio chunk"""
    sid = request.sid

    with session_lock:
        session = active_sessions.get(sid)

    if not session or 'stream' not in session:
        logger.warning(f"[{sid}] Received audio chunk but no active stream found. Ignoring.")
        return

    try:
        audio_bytes = None
        if isinstance(data, bytes):
             audio_bytes = data
        elif isinstance(data, dict) and 'audio_chunk' in data and isinstance(data['audio_chunk'], bytes):
             audio_bytes = data['audio_chunk']
        elif isinstance(data, dict) and isinstance(data.get('args'), list) and len(data['args']) > 0 and isinstance(data['args'][0], bytes):
             audio_bytes = data['args'][0]
        elif isinstance(data, str):
             try:
                 audio_bytes = base64.b64decode(data)
                 logger.debug(f"[{sid}] Audio data decoded from base64 string ({len(audio_bytes)} bytes)")
             except base64.binascii.Error:
                 logger.warning(f"[{sid}] Received string data that is not valid base64. Ignoring.")
                 return
        else:
            logger.warning(f"[{sid}] Unrecognized audio data format received. Type: {type(data)}. Data: {str(data)[:100]}...")
            return

        if audio_bytes:
            session['stream'].write(audio_bytes)
        else:
            logger.warning(f"[{sid}] Could not extract audio bytes from received data. Ignoring.")

    except Exception as e:
        logger.error(f"[{sid}] Audio processing error: {e}", exc_info=True)

@socketio.on('stop_recognition')
def on_stop_recognition():
    """Client explicitly requests to stop the recognition session."""
    sid = request.sid
    logger.info(f"[{sid}] Received stop_recognition request from client.")
    stop_session(sid)
    emit('recognition_stopped', {'message': 'Recognition stopped by client request.'}, room=sid)

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