import logging
import os
import base64
# import threading # No longer needed for session lock
import azure.cognitiveservices.speech as speechsdk # Keep if needed for manual_text? Maybe not.
from flask import request, current_app
from flask_socketio import emit, join_room, leave_room # Import room functions

from app import socketio

# Basic setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Remove session state management ---
# active_sessions = {}
# session_lock = threading.Lock()
# sessions = {}


@socketio.on('connect')
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_success', {'message': 'Connected successfully'})

@socketio.on('disconnect')
def on_disconnect():
    # No specific session cleanup needed anymore for recognition
    logger.info(f"Client disconnected: {request.sid}")
    # If using rooms, Flask-SocketIO handles leaving rooms on disconnect by default

# --- Add Room Handling ---
@socketio.on('join_room')
def on_join_room(data):
    sid = request.sid
    room_id = data.get('room_id')
    if room_id:
        join_room(room_id)
        logger.info(f"[{sid}] Client joined room: {room_id}")
        # Optionally confirm join back to client
        emit('room_joined', {'room_id': room_id})
    else:
        logger.warning(f"[{sid}] Client attempted to join without room_id.")


# --- Remove Recognition Handlers ---
# @socketio.on('start_recognition')
# def on_start_recognition(data):
#     pass # Remove implementation

# @socketio.on('audio_chunk')
# def on_audio_chunk(data):
#     pass # Remove implementation

# @socketio.on('stop_recognition')
# def on_stop_recognition(data):
#     pass # Remove implementation

# def stop_current_session(sid):
#     pass # Remove implementation


# --- Keep Manual Text Handler (if needed) ---
@socketio.on('manual_text')
def on_manual_text(data):
    """Process manually entered text for translation"""
    sid = request.sid
    room_id = data.get('room_id')
    text = data.get('text')
    source_language = data.get('source_language', 'en-US')
    target_languages = data.get('target_languages', ['es-ES'])  # Default to Spanish
    is_manual = data.get('is_manual', False) # Get the flag from frontend

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
                logger.info(f"[{sid}] Skipping translation from {base_source_lang} to {base_target_lang} (same language)")
                # Optionally emit original back if needed for manual text
                # result_data = { ... original: text, translated: text ...}
                # socketio.emit('translation_result', result_data, room=room_id)
                # emit('translation_result', result_data) # Back to admin
                continue

            # Translate the text
            translated = translation_service.translate(text, base_target_lang, base_source_lang)

            if translated:
                logger.info(f"[{sid}] Translated: '{text}' -> '{translated}'")

                result_data = {
                    'original': text,
                    'translated': translated,
                    'source_language': source_language,
                    'target_language': target_language,
                    'room_id': room_id,
                    'is_manual': is_manual # Include flag in response
                }

                # Emit to the room if room_id exists
                if room_id:
                    socketio.emit('translation_result', result_data, room=room_id)

                # Also emit back to the admin who sent it
                emit('translation_result', result_data)
            else:
                logger.error(f"[{sid}] Translation failed for manual text to {target_language}")
                emit('translation_error', {
                    'original': text,
                    'message': f'Translation failed for target {target_language}',
                    'room_id': room_id,
                    'source_language': source_language,
                    'target_language': target_language,
                })
    except Exception as e:
        logger.error(f"[{sid}] Manual text error: {e}", exc_info=True)
        emit('error', {'message': f'Manual text processing error: {str(e)}'})