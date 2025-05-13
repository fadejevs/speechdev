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
import uuid
from pydub import AudioSegment
from io import BytesIO
from app.utils.audio import convert_to_wav
import gevent.monkey

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

# Add a dictionary to track active real-time sessions
active_realtime_sessions = {}

gevent.monkey.patch_all()

@socketio.on('connect')
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_success', {'message': 'Connected successfully'})

@socketio.on('disconnect')
def on_disconnect():
    # No specific session cleanup needed anymore for recognition
    logger.info(f"Client disconnected: {request.sid}")
    # If using rooms, Flask-SocketIO handles leaving rooms on disconnect by default

    # Clean up any active real-time session
    if request.sid in active_realtime_sessions:
        try:
            session = active_realtime_sessions[request.sid]
            session['recognizer'].stop_continuous_recognition_async()
            del active_realtime_sessions[request.sid]
            logger.info(f"[{request.sid}] Cleaned up real-time session on disconnect")
        except Exception as e:
            logger.error(f"[{request.sid}] Error cleaning up real-time session: {e}", exc_info=True)

# --- Add Room Handling ---
@socketio.on('join_room')
def handle_join_room(data):
    """Handles a client joining a room."""
    room = data.get('room')
    if not room:
        logger.warning(f"[{request.sid}] Client attempted to join without specifying a room.")
        # Optionally emit an error back to the client
        # emit('error', {'message': 'Room must be specified.'})
        return

    join_room(room)
    logger.info(f"[{request.sid}] Client joined room: {room}")

    # REMOVE OR COMMENT OUT THE TEST MESSAGE:
    # logger.info(f"[{request.sid}] Sent test translation_result to room: {room}")
    # test_data = {
    #     'original': 'Test message from the server',
    #     'source_language': 'en-US',
    #     'translations': {
    #         'es-ES': 'Mensaje de prueba del servidor',
    #         'fr-FR': 'Message test du serveur',
    #         'lv-LV': 'Testa ziņojums no servera' # Added Latvian test
    #     }
    # }
    # emit('translation_result', test_data, room=room)


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
def handle_audio_chunk(data):
    """Handles receiving an audio chunk from a client."""
    sid = request.sid
    room_id = data.get('room_id')
    audio_chunk_b64 = data.get('audio')
    audio_chunk_bytes = base64.b64decode(audio_chunk_b64) if audio_chunk_b64 else None
    source_language = data.get('language')
    target_languages = data.get('target_languages', [])

    if not all([room_id, audio_chunk_bytes, source_language]):
        logger.warning(f"[{sid}] Incomplete audio chunk data: room={room_id}, audio_present={bool(audio_chunk_bytes)}, lang={source_language}")
        emit('translation_error', {'message': 'Incomplete audio data received.', 'room_id': room_id})
        return

    logger.info(f"[{sid}] Received audio chunk for room '{room_id}', lang: {source_language}, targets: {target_languages}")

    try:
        # Get services from app context
        speech_service = current_app.speech_service
        translation_service = current_app.translation_service

        if not speech_service or not translation_service:
            logger.error(f"[{sid}] Speech or Translation service not available.")
            emit('error', {'message': 'Backend services not available.'}) # Emit to sender
            return

        # Save audio bytes to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
            temp_audio_file.write(audio_chunk_bytes)
            temp_audio_path = temp_audio_file.name

        try:
            recognized_text = speech_service.recognize_speech_from_file(temp_audio_path, language=source_language)
        finally:
            os.remove(temp_audio_path)

        if not recognized_text:
            logger.info(f"[{sid}] No speech recognized from chunk for room {room_id}.")
            return

        logger.info(f"[{sid}] Recognized for room '{room_id}': '{recognized_text}'")

        # --- 2. Translation ---
        translations = {}
        if not target_languages:
            logger.info(f"[{sid}] No target languages for audio chunk, emitting original to room {room_id}")
            result_data = {
                'original': recognized_text,
                'translations': {},
                'source_language': source_language,
                'target_language': None,
                'room_id': room_id,
                'is_manual': False,
                'is_final': False
            }
            socketio.emit('translation_result', result_data, room=room_id)
        else:
            logger.info(f"[{sid}] Translating '{recognized_text[:30]}...' from {source_language} to {target_languages} for room {room_id}")
            for target_lang in target_languages:
                try:
                    translated = translation_service.translate(recognized_text, target_lang, source_language)
                    if translated:
                        translations[target_lang] = translated
                        logger.info(f"[{sid}] Translated to {target_lang} for room '{room_id}': '{translated[:30]}...'")
                        result_data = {
                            'original': recognized_text,
                            'translations': {target_lang: translated},
                            'source_language': source_language,
                            'target_language': target_lang,
                            'room_id': room_id,
                            'is_manual': False,
                            'is_final': False
                        }
                        socketio.emit('translation_result', result_data, room=room_id)
                    else:
                        logger.error(f"[{sid}] Translation failed for {target_lang}")
                        emit('translation_error', {
                            'original': recognized_text,
                            'message': f'Translation failed for target {target_lang}',
                            'room_id': room_id,
                            'source_language': source_language,
                            'target_language': target_lang,
                        })
                        translations[target_lang] = "[Translation Error]"
                except Exception as e:
                    logger.error(f"[{sid}] Error translating to {target_lang}: {e}", exc_info=True)
                    emit('translation_error', {
                        'original': recognized_text,
                        'message': f'Error translating to {target_lang}: {e}',
                        'room_id': room_id,
                        'source_language': source_language,
                        'target_language': target_lang,
                    })

    except Exception as e:
        logger.error(f"[{sid}] Audio chunk error: {e}", exc_info=True)
        emit('error', {'message': f'Audio chunk processing error: {str(e)}'})

@socketio.on('start_realtime_recognition')
def on_start_realtime_recognition(data):
    """Initialize a real-time recognition session"""
    sid = request.sid
    room_id = data.get('room_id')
    language = data.get('language', 'en-US')
    target_languages = data.get('target_languages', [])
    
    logger.info(f"[{sid}] Starting real-time recognition for room '{room_id}' in language '{language}'")
    
    if not room_id:
        emit('error', {'message': 'Room ID is required for real-time recognition'})
        return
    
    # Get services from the app context
    speech_service = current_app.speech_service
    
    # Create a speech recognizer for this session
    recognizer_data = speech_service.create_recognizer(language)
    if not recognizer_data:
        emit('error', {'message': 'Failed to create speech recognizer'})
        return
    
    # Store session data
    active_realtime_sessions[sid] = {
        'room_id': room_id,
        'language': language,
        'target_languages': target_languages,
        'recognizer': recognizer_data['recognizer'],
        'audio_stream': recognizer_data['audio_stream'],
        'partial_result': '',
        'last_final_result': ''
    }
    
    # Set up event handlers for the recognizer
    recognizer = recognizer_data['recognizer']
    
    # Handle intermediate results (real-time updates)
    recognizer.recognizing.connect(lambda evt: handle_recognizing(evt, sid))
    
    # Handle final recognition results
    recognizer.recognized.connect(lambda evt: handle_recognized(evt, sid))
    
    # Start continuous recognition
    recognizer.start_continuous_recognition_async()
    
    emit('realtime_recognition_started', {
        'message': 'Real-time recognition started',
        'room_id': room_id
    })

def handle_recognizing(evt, sid):
    """Handle intermediate recognition results"""
    if sid not in active_realtime_sessions:
        return
    
    session = active_realtime_sessions[sid]
    room_id = session['room_id']
    partial_text = evt.result.text
    
    if not partial_text:
        return
    
    # Update the session's partial result
    session['partial_result'] = partial_text
    
    # Emit the partial result to the room
    socketio.emit('realtime_transcription', {
        'text': partial_text,
        'is_final': False,
        'source_language': session['language'],
        'room_id': room_id
    }, room=room_id)

def handle_recognized(evt, sid):
    """Handle final recognition results"""
    if sid not in active_realtime_sessions:
        return
    
    session = active_realtime_sessions[sid]
    room_id = session['room_id']
    final_text = evt.result.text
    
    if not final_text:
        return
    
    # Skip if this is a duplicate of the last final result
    if final_text == session['last_final_result']:
        return
    
    # Update the session's last final result
    session['last_final_result'] = final_text
    
    # Emit the final transcription
    socketio.emit('realtime_transcription', {
        'text': final_text,
        'is_final': True,
        'source_language': session['language'],
        'room_id': room_id
    }, room=room_id)
    
    # Process translations for the final text
    process_realtime_translation(sid, final_text)

def process_realtime_translation(sid, text):
    """Translate the recognized text in real-time"""
    if sid not in active_realtime_sessions:
        return
    
    session = active_realtime_sessions[sid]
    room_id = session['room_id']
    source_language = session['language']
    target_languages = session['target_languages']
    
    # Get translation service
    translation_service = current_app.translation_service
    
    # Process translations for each target language
    translations = {}
    for target_lang in target_languages:
        try:
            translated = translation_service.translate_text(
                text, 
                target_lang, 
                source_language
            )
            
            if translated:
                translations[target_lang] = translated
                logger.info(f"[{sid}] Translated to {target_lang}: '{translated[:30]}...'")
        except Exception as e:
            logger.error(f"[{sid}] Error translating to {target_lang}: {e}", exc_info=True)
            translations[target_lang] = f"[Translation error: {str(e)}]"
    
    # Emit the translation results
    socketio.emit('realtime_translation', {
        'original': text,
        'translations': translations,
        'source_language': source_language,
        'room_id': room_id
    }, room=room_id)

@socketio.on('realtime_audio_chunk')
def on_realtime_audio_chunk(data):
    """Process real-time audio chunks"""
    sid = request.sid
    room_id = data.get('room_id')
    audio_data = data.get('audio_data')
    
    if sid not in active_realtime_sessions:
        logger.warning(f"[{sid}] Received audio chunk but no active real-time session")
        return
    
    session = active_realtime_sessions[sid]
    
    if not audio_data:
        logger.warning(f"[{sid}] Received empty audio chunk")
        return
    
    try:
        # Decode the base64 audio data
        audio_bytes = base64.b64decode(audio_data)
        
        # Push the audio data to the stream
        session['audio_stream'].write(audio_bytes)
        
    except Exception as e:
        logger.error(f"[{sid}] Error processing real-time audio chunk: {e}", exc_info=True)
        emit('error', {'message': f'Error processing audio: {str(e)}'})

@socketio.on('stop_realtime_recognition')
def on_stop_realtime_recognition(data):
    """Stop real-time recognition"""
    sid = request.sid
    
    if sid not in active_realtime_sessions:
        return
    
    session = active_realtime_sessions[sid]
    room_id = session['room_id']
    
    try:
        # Stop the recognizer
        session['recognizer'].stop_continuous_recognition_async()
        
        # Clean up the session
        del active_realtime_sessions[sid]
        
        logger.info(f"[{sid}] Stopped real-time recognition for room '{room_id}'")
        
        emit('realtime_recognition_stopped', {
            'message': 'Real-time recognition stopped',
            'room_id': room_id
        })
        
    except Exception as e:
        logger.error(f"[{sid}] Error stopping real-time recognition: {e}", exc_info=True)
        emit('error', {'message': f'Error stopping recognition: {str(e)}'})

@socketio.on('audio')
def handle_audio(data):
    """Handle raw audio event from live page and emit a mock transcription for testing."""
    sid = request.sid
    logger.info(f"[{sid}] Received 'audio' event with {len(data) if data else 0} bytes")
    # For testing, emit a fake transcription to all clients
    socketio.emit('realtime_transcription', {
        'text': 'MOCK TRANSCRIPTION',
        'source_language': 'en'
    })

@socketio.on('realtime_transcription')
def handle_realtime_transcription(data):
    room_id = data.get('room_id')
    if not room_id:
        logger.warning("No room_id in realtime_transcription event")
        return
    socketio.emit('realtime_transcription', data, room=room_id)

@socketio.on('update_event_status')
def handle_update_event_status(data):
    room_id = data.get('room_id')
    status = data.get('status')  # e.g., "Paused" or "Completed"
    if room_id and status:
        socketio.emit('event_status_update', {'status': status}, room=room_id)