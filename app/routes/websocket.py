import logging
import os
import base64
# import threading # No longer needed for session lock
import azure.cognitiveservices.speech as speechsdk # Keep if needed for manual_text? Maybe not.
from flask import request, current_app
from flask_socketio import emit, join_room, leave_room # Import room functions
import io # Needed for handling audio bytes
import tempfile # For temporary files
import traceback # For detailed error logging

from app import socketio
from app.services.speech_service import SpeechService # Assuming SpeechService can handle bytes
from app.services.translation_service import TranslationService # Assuming TranslationService is available

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
        emit('error', {'message': 'Room ID is required to join.'})


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
    room_id = data.get('room_id') # Ensure frontend sends 'room_id'
    text = data.get('text')
    source_language = data.get('language', 'en-US') # Match key from frontend
    target_languages = data.get('target_languages', []) # Match key from frontend
    is_manual = data.get('is_manual', True) # Default to true for this handler

    logger.info(f"[{sid}] Manual text for room '{room_id}': '{text}'")

    if not all([room_id, text, source_language]):
        logger.warning(f"[{sid}] Incomplete manual text data: room={room_id}, text_present={bool(text)}, lang={source_language}")
        emit('translation_error', {'message': 'Incomplete data for manual text processing.', 'room_id': room_id})
        return

    try:
        # Get translation service
        translation_service = current_app.translation_service
        if not translation_service:
            logger.error(f"[{sid}] Translation service not available")
            emit('error', {'message': 'Translation service not configured'})
            return

        # Extract base language codes if needed by your service
        # base_source_lang = source_language.split('-')[0]

        if not target_languages:
             # If no target languages, just emit the original text back to the room
             logger.info(f"[{sid}] No target languages for manual text, emitting original to room {room_id}")
             result_data = {
                 'original': text,
                 'translations': {}, # Send empty translations object
                 'source_language': source_language,
                 'target_language': None, # Indicate no specific target translation
                 'room_id': room_id,
                 'is_manual': is_manual,
                 'is_final': True # Manual text is final
             }
             socketio.emit('translation_result', result_data, room=room_id)
             # Also emit back to the sender if needed (e.g., for confirmation)
             # emit('translation_result', result_data)
             return


        translations = {}
        for target_language in target_languages:
            # base_target_lang = target_language.split('-')[0]
            # Skip if source and target are the same (optional, depends on service)
            # if base_source_lang == base_target_lang: continue

            # Translate the text (assuming translate method exists)
            # Adjust method name and parameters as needed for your TranslationService
            translated = translation_service.translate(text, target_language, source_language)

            if translated:
                logger.info(f"[{sid}] Translated manual text: '{text}' -> '{translated}' for {target_language}")
                translations[target_language] = translated

                # Emit individual translation result
                result_data = {
                    'original': text,
                    'translations': {target_language: translated}, # Send specific translation
                    'source_language': source_language,
                    'target_language': target_language, # Indicate the target for this result
                    'room_id': room_id,
                    'is_manual': is_manual,
                    'is_final': True # Manual text is final
                }
                socketio.emit('translation_result', result_data, room=room_id)
                # Also emit back to the admin who sent it (optional)
                # emit('translation_result', result_data)

            else:
                logger.error(f"[{sid}] Translation failed for manual text to {target_language}")
                emit('translation_error', {
                    'original': text,
                    'message': f'Translation failed for target {target_language}',
                    'room_id': room_id,
                    'source_language': source_language,
                    'target_language': target_language,
                })
                translations[target_language] = "[Translation Error]" # Store error indicator

    except Exception as e:
        logger.error(f"[{sid}] Manual text error: {e}", exc_info=True)
        emit('error', {'message': f'Manual text processing error: {str(e)}'})


# --- NEW: Audio Chunk Handler ---
@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Handles receiving an audio chunk from a client."""
    sid = request.sid
    room_id = data.get('room_id') # Use 'room_id' to match frontend emit
    audio_chunk_bytes = data.get('audio')
    source_language = data.get('language')
    target_languages = data.get('target_languages', [])

    if not all([room_id, audio_chunk_bytes, source_language]):
        logger.warning(f"[{sid}] Incomplete audio chunk data: room={room_id}, audio_present={bool(audio_chunk_bytes)}, lang={source_language}")
        emit('translation_error', {'message': 'Incomplete audio data received.', 'room_id': room_id})
        return

    logger.info(f"[{sid}] Received audio chunk for room '{room_id}', lang: {source_language}, targets: {target_languages}")

    temp_file_path = None
    try:
        # Get services from app context
        speech_service = current_app.speech_service
        translation_service = current_app.translation_service

        if not speech_service or not translation_service:
            logger.error(f"[{sid}] Speech or Translation service not available.")
            emit('error', {'message': 'Backend services not available.'}) # Emit to sender
            return

        # --- 1. Speech Recognition ---
        # Save chunk temporarily as SpeechService expects a file path
        temp_dir = "temp_audio_chunks" # Define a directory for chunks
        os.makedirs(temp_dir, exist_ok=True) # Ensure directory exists

        # Use NamedTemporaryFile for safer handling
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm", dir=temp_dir) as temp_file:
            temp_file.write(audio_chunk_bytes)
            temp_file_path = temp_file.name
            logger.debug(f"[{sid}] Saved temporary audio chunk to {temp_file_path}")

        # Call the CORRECT method WITHOUT the language argument
        # Assuming SpeechService uses config or internal logic for language
        recognized_text = speech_service.recognize_speech(temp_file_path) # REMOVE source_language argument

        if not recognized_text:
            logger.info(f"[{sid}] No speech recognized from chunk for room {room_id}.")
            # Clean up before returning
            if temp_file_path and os.path.exists(temp_file_path):
                 try:
                     os.remove(temp_file_path)
                     logger.debug(f"[{sid}] Removed temporary audio chunk {temp_file_path} after no recognition.")
                 except OSError as e:
                     logger.error(f"[{sid}] Error removing temporary file {temp_file_path} after no recognition: {e}")
            return # Exit early if no text

        logger.info(f"[{sid}] Recognized for room '{room_id}': '{recognized_text}'")

        # --- 2. Translation ---
        translations = {}
        if not target_languages:
             # If no target languages, just emit the original transcription
             logger.info(f"[{sid}] No target languages for audio chunk, emitting original to room {room_id}")
             result_data = {
                 'original': recognized_text,
                 'translations': {}, # Send empty translations object
                 'source_language': source_language,
                 'target_language': None, # Indicate no specific target translation
                 'room_id': room_id,
                 'is_manual': False,
                 'is_final': False # Indicate chunk processing
             }
             socketio.emit('translation_result', result_data, room=room_id)

        else:
            logger.info(f"[{sid}] Translating '{recognized_text[:30]}...' from {source_language} to {target_languages} for room {room_id}")
            for target_lang in target_languages:
                try:
                    # Use the translate method from TranslationService
                    translated = translation_service.translate(recognized_text, target_lang, source_language)
                    if translated:
                        translations[target_lang] = translated
                        logger.info(f"[{sid}] Translated to {target_lang} for room '{room_id}': '{translated[:30]}...'")

                        # --- 3/4. Prepare & Emit Result per Language ---
                        result_data = {
                            'original': recognized_text,
                            'translations': {target_lang: translated}, # Send specific translation
                            'source_language': source_language,
                            'target_language': target_lang, # Indicate the target for this result
                            'room_id': room_id,
                            'is_manual': False, # Indicate this is from live audio
                            'is_final': False # Indicate chunk processing
                        }
                        logger.debug(f"[{sid}] Emitting 'translation_result' to room '{room_id}' for lang {target_lang}")
                        socketio.emit('translation_result', result_data, room=room_id)

                    else:
                        translations[target_lang] = "[Translation unavailable]"
                        logger.warning(f"[{sid}] Translation to {target_lang} returned unavailable for room {room_id}")
                        emit('translation_error', {
                             'message': f'Translation unavailable for target {target_lang}',
                             'room_id': room_id, 'original': recognized_text, 'target_language': target_lang
                        })


                except Exception as e:
                    logger.error(f"[{sid}] Error translating to {target_lang} for room {room_id}: {e}", exc_info=True)
                    translations[target_lang] = "[Translation Error]"
                    emit('translation_error', {
                        'message': f'Translation error for target {target_lang}: {str(e)}',
                        'room_id': room_id, 'original': recognized_text, 'target_language': target_lang
                    })


    except Exception as e:
        logger.error(f"[{sid}] Error processing audio chunk for room {room_id}: {e}", exc_info=True)
        emit('error', {'message': f'Error processing audio: {str(e)}', 'room_id': room_id})

    finally:
        # --- Clean up temporary file ---
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.debug(f"[{sid}] Removed temporary audio chunk {temp_file_path}")
            except OSError as e:
                 logger.error(f"[{sid}] Error removing temporary file {temp_file_path}: {e}")