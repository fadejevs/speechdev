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

# Dictionary to hold session state per client (SID)
sessions = {}

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
    """Start a recognition and translation session"""
    sid = request.sid
    room_id = data.get('room_id')
    source_language = data.get('source_language', 'en-US')
    target_languages = data.get('target_languages', []) # Expecting a list

    logger.info(f"[{sid}] Starting recognition in room '{room_id}': {source_language} -> {target_languages}")

    # --- Stop existing session for this client if any ---
    stop_current_session(sid) # Call the cleanup function

    try:
        speech_service = current_app.speech_service
        translation_service = current_app.translation_service

        if not speech_service or not speech_service.azure_key:
            logger.error(f"[{sid}] Speech service not configured.")
            emit('error', {'message': 'Speech service not configured on server.'})
            return

        if not translation_service:
            logger.error(f"[{sid}] Translation service not configured.")
            emit('error', {'message': 'Translation service not configured on server.'})
            # Allow recognition without translation? Or return? For now, return.
            return

        # --- Create Recognizer Components ---
        speech_config = speechsdk.SpeechConfig(subscription=speech_service.azure_key, region=speech_service.azure_region)
        speech_config.speech_recognition_language = source_language
        # Optional: Add profanity masking if desired
        # speech_config.set_profanity(speechsdk.ProfanityOption.Masked)

        push_stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=push_stream)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        # Store components in session state
        sessions[sid] = {
            'recognizer': recognizer,
            'audio_stream': push_stream,
            'room_id': room_id,
            'source_language': source_language,
            'target_languages': target_languages,
            'translation_service': translation_service,
            'session_active': True # Flag to track if session is running
        }
        logger.debug(f"[{sid}] Session created.")

        # --- Define Event Handlers ---
        def session_started_cb(evt: speechsdk.SessionEventArgs):
            logger.info(f'[{sid}] SESSION STARTED: {evt}')
            emit('recognition_started', {'message': 'Azure session started.'})

        def session_stopped_cb(evt: speechsdk.SessionEventArgs):
            logger.info(f'[{sid}] SESSION STOPPED: {evt}')
            # Mark session as inactive, cleanup might happen elsewhere
            if sid in sessions:
                 sessions[sid]['session_active'] = False
            emit('recognition_stopped', {'message': 'Azure session stopped.'})


        def recognizing_cb(evt: speechsdk.SpeechRecognitionEventArgs):
            """Intermediate results"""
            if evt.result.reason == speechsdk.ResultReason.RecognizingSpeech:
                logger.debug(f'[{sid}] Recognizing: {evt.result.text}')
                emit('recognizing_result', {
                    'text': evt.result.text,
                    'room_id': room_id
                }, room=sid) # Send only to admin? Or room too?

        def recognized_cb(evt: speechsdk.SpeechRecognitionEventArgs):
            """Final results for an utterance"""
            result = evt.result
            logger.debug(f"[{sid}] Entering recognized_cb. Reason: {result.reason}")

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                text = result.text
                logger.info(f"[{sid}] Recognized: {text}")

                if not text or text.isspace():
                    logger.info(f"[{sid}] Empty text recognized, skipping translation.")
                    return

                # Get services and languages from session
                session_data = sessions.get(sid)
                if not session_data:
                    logger.error(f"[{sid}] Session data not found in recognized_cb.")
                    return

                current_translation_service = session_data['translation_service']
                current_source_language = session_data['source_language']
                current_target_languages = session_data['target_languages']

                base_source_lang = current_source_language.split('-')[0]

                for target_language in current_target_languages:
                    base_target_lang = target_language.split('-')[0]

                    # Skip if source and target are the same base language
                    if base_source_lang == base_target_lang:
                        logger.info(f"[{sid}] Skipping translation from {base_source_lang} to {base_target_lang} (same base language)")
                        # Optionally emit the original text as a "translation"
                        socketio.emit('translation_result', {
                            'original': text,
                            'translated': text, # Send original if langs match
                            'source_language': current_source_language,
                            'target_language': target_language,
                            'room_id': room_id
                        }, room=room_id) # Emit to the main room
                        emit('translation_result', { # Emit back to admin
                            'original': text,
                            'translated': text,
                            'source_language': current_source_language,
                            'target_language': target_language,
                            'room_id': room_id
                        })
                        continue # Move to next target language

                    try:
                        logger.debug(f"[{sid}] Attempting translation: '{text}' from {base_source_lang} to {base_target_lang}")
                        translated = current_translation_service.translate(text, base_target_lang, base_source_lang)

                        if translated:
                            logger.info(f"[{sid}] Translated ({current_translation_service.service_type}): '{text}' -> '{translated}'")
                            # Emit to the main room
                            socketio.emit('translation_result', {
                                'original': text,
                                'translated': translated,
                                'source_language': current_source_language,
                                'target_language': target_language,
                                'room_id': room_id
                            }, room=room_id)
                             # Emit back to the admin who initiated
                            emit('translation_result', {
                                'original': text,
                                'translated': translated,
                                'source_language': current_source_language,
                                'target_language': target_language,
                                'room_id': room_id
                            })
                        else:
                            logger.warning(f"[{sid}] Translation returned None or empty for '{text}' to {base_target_lang}")
                            emit('translation_error', {
                                'original': text,
                                'message': f'Translation failed or returned empty using {current_translation_service.service_type}.',
                                'source_language': current_source_language,
                                'target_language': target_language,
                                'room_id': room_id
                            })
                    except Exception as e:
                        logger.error(f"[{sid}] Translation error for '{text}': {e}", exc_info=True)
                        emit('translation_error', {
                            'original': text,
                            'message': f'Translation processing error: {str(e)}',
                            'source_language': current_source_language,
                            'target_language': target_language,
                            'room_id': room_id
                        })

            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.info(f"[{sid}] NOMATCH: Speech could not be recognized. Details: {result.no_match_details}")
                emit('recognition_nomatch', {'message': f'No speech recognized: {result.no_match_details}'})
            elif result.reason == speechsdk.ResultReason.Canceled:
                logger.warning(f"[{sid}] CANCELED in recognized_cb: Reason={result.cancellation_details.reason}")
                if result.cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logger.error(f"[{sid}] CANCELED ErrorDetails={result.cancellation_details.error_details}")
                    emit('error', {'message': f'Recognition Error: {result.cancellation_details.error_details}'})
                stop_current_session(sid) # Stop session on cancellation

        def canceled_cb(evt: speechsdk.SpeechRecognitionCanceledEventArgs):
            """Handles cancellation events."""
            logger.warning(f'[{sid}] RECOGNITION CANCELED: Reason={evt.reason}')
            if evt.reason == speechsdk.CancellationReason.Error:
                logger.error(f'[{sid}] Canceled Error Details: {evt.error_details}')
                emit('error', {'message': f'Recognition Canceled Error: {evt.error_details}'})
            elif evt.reason == speechsdk.CancellationReason.EndOfStream:
                logger.info(f'[{sid}] Canceled: End of stream reached.')
                emit('recognition_stopped', {'message': 'End of audio stream reached.'})
            else:
                 logger.info(f'[{sid}] Canceled: {evt.reason}')

            stop_current_session(sid) # Stop session on cancellation


        # --- Connect Handlers ---
        recognizer.recognizing.connect(recognizing_cb)
        recognizer.recognized.connect(recognized_cb)
        recognizer.session_started.connect(session_started_cb)
        recognizer.session_stopped.connect(session_stopped_cb)
        recognizer.canceled.connect(canceled_cb)
        logger.debug(f"[{sid}] Event handlers connected.")

        # --- Start Recognition ---
        recognizer.start_continuous_recognition_async()
        logger.info(f"[{sid}] Continuous recognition start requested.")

        emit('recognition_started', {'message': 'Recognition process initiated.'})

    except Exception as e:
        logger.error(f"[{sid}] Error in on_start_recognition: {e}", exc_info=True)
        emit('error', {'message': f'Server error starting recognition: {str(e)}'})
        stop_current_session(sid) # Clean up if start fails


@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Receive audio chunk from client and push to Azure stream"""
    sid = request.sid
    session_data = sessions.get(sid)

    if session_data and session_data.get('session_active'):
        audio_chunk = data # Assuming data is bytes
        audio_stream = session_data.get('audio_stream')
        if audio_stream:
            try:
                if isinstance(audio_chunk, bytes) and len(audio_chunk) > 0:
                    # logger.debug(f"[{sid}] Received audio chunk: {len(audio_chunk)} bytes")
                    audio_stream.write(audio_chunk)
                    # logger.debug(f"[{sid}] Audio chunk written to stream.")
                elif len(audio_chunk) == 0:
                     logger.warning(f"[{sid}] Received empty audio chunk.")
                else:
                     logger.warning(f"[{sid}] Received non-bytes audio chunk type: {type(audio_chunk)}")
            except Exception as e:
                logger.error(f"[{sid}] Error writing to audio stream: {e}", exc_info=True)
                emit('error', {'message': f'Server error processing audio: {str(e)}'})
                stop_current_session(sid)
        else:
            logger.warning(f"[{sid}] Audio stream not found in session for received chunk.")
    # else:
        # logger.warning(f"[{sid}] Received audio chunk but no active session found.")


@socketio.on('stop_recognition')
def on_stop_recognition(data):
    """Client requested to stop recognition"""
    sid = request.sid
    logger.info(f"[{sid}] Received stop_recognition request.")
    stop_current_session(sid)


def stop_current_session(sid):
    """Stops the recognizer and closes the stream for a given client"""
    logger.info(f"[{sid}] Attempting to stop session.")
    session_data = sessions.pop(sid, None) # Remove session data atomically

    if session_data:
        logger.info(f"[{sid}] Session found, stopping components.")
        recognizer = session_data.get('recognizer')
        audio_stream = session_data.get('audio_stream')

        # Stop the recognizer first
        if recognizer:
            try:
                logger.info(f"[{sid}] Requesting stop_continuous_recognition_async.")
                stop_future = recognizer.stop_continuous_recognition_async()
                # Optional: Wait for stop completion if needed, but might block
                # stop_future.get()
                logger.info(f"[{sid}] Stop recognition requested.")
            except Exception as e:
                logger.error(f"[{sid}] Error stopping recognizer: {e}", exc_info=True)

        # Close the audio stream *after* requesting recognizer stop
        if audio_stream:
            try:
                audio_stream.close()
                logger.info(f"[{sid}] Audio stream closed.")
            except Exception as e:
                logger.error(f"[{sid}] Error closing audio stream: {e}", exc_info=True)

        # Disconnect callbacks (optional, good practice)
        if recognizer:
             try:
                 recognizer.recognizing.disconnect_all()
                 recognizer.recognized.disconnect_all()
                 recognizer.session_started.disconnect_all()
                 recognizer.session_stopped.disconnect_all()
                 recognizer.canceled.disconnect_all()
                 logger.info(f"[{sid}] Recognizer callbacks disconnected.")
             except Exception as e:
                 logger.error(f"[{sid}] Error disconnecting callbacks: {e}", exc_info=True)


        logger.info(f"[{sid}] Session cleanup complete.")
        emit('recognition_stopped', {'message': 'Recognition stopped by server.'}, room=sid)
    else:
        logger.info(f"[{sid}] No active session found to stop.")


# --- Add cleanup on disconnect ---
@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")
    stop_current_session(sid) # Ensure cleanup happens if client disconnects abruptly


@socketio.on('manual_text')
def on_manual_text(data):
    """Process manually entered text for translation"""
    sid = request.sid
    room_id = data.get('room_id')
    text = data.get('text')
    source_language = data.get('source_language', 'en-US')
    target_languages = data.get('target_languages', ['es-ES'])  # Default to Spanish
    
    logger.info(f"[{sid}] Manual text for room '{room_id}': '{text}'")
    
    if not text:
        logger.warning(f"[{sid}] Empty text provided")
        return
        
    try:
        # Get translation service
        translation_service = current_app.translation_service
        if not translation_service:
            logger.error(f"[{sid}] Translation service not available")
            emit('error', {'message': 'Translation service not configured'})
            return
            
        # Extract base language codes
        base_source_lang = source_language.split('-')[0]
        
        for target_language in target_languages:
            base_target_lang = target_language.split('-')[0]
            
            # Skip if source and target are the same
            if base_source_lang == base_target_lang:
                logger.warning(f"[{sid}] Skipping translation from {base_source_lang} to {base_target_lang} (same language)")
                continue
                
            # Translate the text
            translated = translation_service.translate(text, base_target_lang, base_source_lang)
            
            if translated:
                logger.info(f"[{sid}] Translated: '{text}' -> '{translated}'")
                
                # Emit to the room
                socketio.emit('translation_result', {
                    'original': text,
                    'translated': translated,
                    'source_language': source_language,
                    'target_language': target_language,
                    'room_id': room_id
                }, room=room_id)
                
                # Also emit to the admin
                emit('translation_result', {
                    'original': text,
                    'translated': translated,
                    'source_language': source_language,
                    'target_language': target_language,
                    'room_id': room_id
                })
            else:
                logger.error(f"[{sid}] Translation failed")
                emit('translation_error', {
                    'original': text,
                    'message': 'Translation failed'
                })
    except Exception as e:
        logger.error(f"[{sid}] Manual text error: {e}", exc_info=True)
        emit('error', {'message': f'Manual text error: {str(e)}'})