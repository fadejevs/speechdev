from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from app import socketio
import time
import logging
# TODO: Import or integrate with a streaming-capable SpeechService
# from app.services.speech_service import SpeechService # Assuming you add streaming methods here
import os
import threading
from queue import Queue

# Import Azure Speech SDK
import azure.cognitiveservices.speech as speechsdk

# Configure logging if not already configured elsewhere in the module
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('azure').setLevel(logging.INFO) # Keep Azure less verbose unless needed

# Create an instance of your translation service
# Consider getting this from the app context if initialized there
try:
    translation_service = current_app.config.get('TRANSLATION_SERVICE')
    if not translation_service:
        translation_service = TranslationService()
        logging.warning("Created new TranslationService instance in websocket.py")
except RuntimeError:
    # Handle cases where this runs outside app context during import
    translation_service = TranslationService()
    logging.warning("Created TranslationService instance outside app context in websocket.py")


# --- Global State Management ---
# Dictionary to hold active recognizers and streams per room
# Structure: { room_id: {'recognizer': SpeechRecognizer, 'stream': PushAudioInputStream, 'translation_service': TranslationService, 'target_languages': [] }}
active_recognizers = {}
recognizer_lock = threading.Lock() # To protect access to the dictionary

# --- Helper Function to Get Translation Service ---
def get_translation_service():
    """Safely gets the TranslationService instance."""
    try:
        service = current_app.config.get('TRANSLATION_SERVICE')
        if not service:
            logging.warning("TRANSLATION_SERVICE not found in app config, creating new instance.")
            service = TranslationService()
        return service
    except RuntimeError:
        logging.warning("Running outside Flask app context, creating new TranslationService instance.")
        return TranslationService()
    except Exception as e:
        logging.error(f"Error getting TranslationService: {e}", exc_info=True)
        return TranslationService() # Fallback

# --- Azure Speech Event Handlers ---
# These functions will be called by the Azure SDK in separate threads.

def handle_final_result(evt, room_id):
    """Callback for final recognized speech."""
    try:
        text = evt.result.text
        language = evt.result.language
        logging.info(f"Azure RECOGNIZED (Room: {room_id}, Lang: {language}): {text}") # Log language

        if not text:
            logging.debug(f"Azure RECOGNIZED event with empty text for room {room_id}")
            return

        # Emit final transcription
        socketio.emit('live_transcription', {
            'text': text,
            'language': language, # Use language detected by Azure
            'is_final': True
        }, room=room_id)
        logging.info(f"Emitted final transcription to room {room_id}")

        # --- Temporarily Disable Translation for Debugging ---
        # with recognizer_lock:
        #     recognizer_info = active_recognizers.get(room_id)
        # if recognizer_info:
        #     target_languages = recognizer_info.get('target_languages', [])
        #     translation_service = recognizer_info.get('translation_service')
        #     if translation_service and target_languages:
        #         logging.info(f"Translating '{text}' to {target_languages} for room {room_id}")
        #         source_lang_azure = language
        #         for target_lang in target_languages:
        #             target_lang_deepl = translation_service.map_language_code(target_lang, 'deepl')
        #             source_lang_deepl = translation_service.map_language_code(source_lang_azure, 'deepl')
        #             if not target_lang_deepl: continue
        #             try:
        #                 translated_text = translation_service.translate(text, target_lang=target_lang_deepl, source_lang=source_lang_deepl)
        #                 if translated_text:
        #                     socketio.emit('live_translation', {'target_language': target_lang, 'translated_text': translated_text}, room=room_id)
        #                     logging.info(f"Emitted translation ({target_lang}) to room {room_id}: {translated_text}")
        #                 else: logging.warning(f"Translation to {target_lang} returned empty result for room {room_id}")
        #             except Exception as e:
        #                 logging.error(f"Error during translation to {target_lang} for room {room_id}: {e}", exc_info=True)
        #                 socketio.emit('translation_error', {'language': target_lang, 'error': str(e)}, room=room_id)
        # --- End Temporarily Disable Translation ---

    except Exception as e:
        logging.error(f"Error in handle_final_result callback for room {room_id}: {e}", exc_info=True)


def handle_intermediate_result(evt, room_id):
    """Callback for intermediate speech results."""
    try:
        text = evt.result.text
        logging.debug(f"Azure RECOGNIZING (Room: {room_id}): {text}") # Changed to DEBUG log level

        if not text:
            return

        # Emit intermediate transcription
        socketio.emit('live_transcription', {
            'text': text,
            'language': evt.result.language, # Include language if available
            'is_final': False
        }, room=room_id)
        # logging.debug(f"Emitted intermediate transcription to room {room_id}") # Optional: uncomment if needed
    except Exception as e:
        logging.error(f"Error in handle_intermediate_result callback for room {room_id}: {e}", exc_info=True)


def handle_session_started(evt, room_id):
    """Callback for session start."""
    logging.info(f"Azure SESSION STARTED (Room: {room_id}), SessionId: {evt.session_id}")

def handle_session_stopped(evt, room_id):
    """Callback for session stop."""
    logging.info(f"Azure SESSION STOPPED (Room: {room_id}), SessionId: {evt.session_id}")
    # Session stopped, good place to ensure cleanup happens
    cleanup_recognizer(room_id)


def handle_canceled(evt, room_id):
    """Callback for canceled recognition."""
    try:
        logging.warning(f"Azure RECOGNITION CANCELED for room {room_id}")
        logging.warning(f"CancellationReason: {evt.reason}")
        if evt.reason == speechsdk.CancellationReason.Error:
            logging.error(f"Cancellation ErrorCode: {evt.error_details}")
            logging.error(f"Cancellation ErrorDetails: {evt.error_details}")
            # Emit an error back to the client
            socketio.emit('transcription_error', {
                'error': 'Azure recognition canceled due to error',
                'details': evt.error_details
            }, room=room_id)
        elif evt.reason == speechsdk.CancellationReason.EndOfStream:
             logging.info(f"Azure recognition canceled: End of stream for room {room_id}")
        # Attempt cleanup when canceled
        cleanup_recognizer(room_id)
    except Exception as e:
        logging.error(f"Error in handle_canceled callback for room {room_id}: {e}", exc_info=True)


# --- Recognizer Management ---

def cleanup_recognizer(room_id):
    """Stops recognizer, closes stream, and removes from active list."""
    with recognizer_lock:
        if room_id in active_recognizers:
            logging.info(f"Cleaning up resources for room {room_id}...")
            recognizer_info = active_recognizers.pop(room_id) # Remove from dict first
            recognizer = recognizer_info.get('recognizer')
            stream = recognizer_info.get('stream')

            if recognizer:
                try:
                    # Disconnect handlers first
                    recognizer.recognized.disconnect_all()
                    recognizer.recognizing.disconnect_all()
                    recognizer.session_started.disconnect_all()
                    recognizer.session_stopped.disconnect_all()
                    recognizer.canceled.disconnect_all()
                    logging.debug(f"Disconnected Azure SDK handlers for room {room_id}")

                    # Stop recognition asynchronously
                    stop_future = recognizer.stop_continuous_recognition_async()
                    logging.debug(f"Requesting stop continuous recognition for room {room_id}...")
                    stop_future.get() # Wait for stop to complete
                    logging.info(f"Stopped continuous recognition for room {room_id}")
                except Exception as e:
                    logging.error(f"Error stopping recognizer for room {room_id}: {e}", exc_info=True)

            if stream:
                try:
                    stream.close()
                    logging.info(f"Closed audio stream for room {room_id}")
                except Exception as e:
                    logging.error(f"Error closing stream for room {room_id}: {e}", exc_info=True)

            logging.info(f"Finished cleanup for room {room_id}")
        else:
            logging.debug(f"Cleanup requested for room {room_id}, but no active recognizer found.")


# --- SocketIO Event Handlers ---

@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")
    emit('connection_response', {'data': 'Connected!'})

@socketio.on('disconnect')
def handle_disconnect():
    logging.info(f"Client disconnected: {request.sid}")
    # Find which room(s) the client was in and potentially clean up
    # This simple approach cleans up if the disconnected client was the 'admin'
    room_to_cleanup = None
    with recognizer_lock:
        for room_id, info in active_recognizers.items():
            if info.get('admin_sid') == request.sid:
                room_to_cleanup = room_id
                break
    if room_to_cleanup:
        logging.info(f"Admin client {request.sid} disconnected. Cleaning up room {room_to_cleanup}.")
        cleanup_recognizer(room_to_cleanup)


@socketio.on('join')
def on_join(data):
    """Handles client joining a room and initializes recognition if first user."""
    room = data.get('room')
    source_language = data.get('source_language') # e.g., 'lv-LV'
    target_languages = data.get('target_languages', []) # e.g., ['en-US']

    if not room or not source_language:
        logging.error(f"Join request from {request.sid} missing room or source_language")
        emit('join_error', {'error': 'Missing room or source_language'})
        return

    join_room(room)
    logging.info(f"Client {request.sid} joined room {room} (Source: {source_language}, Targets: {target_languages})")

    with recognizer_lock:
        if room not in active_recognizers:
            logging.info(f"First user ({request.sid}) in room {room}. Initializing Azure Speech Recognizer...")
            try:
                # --- Azure Speech Configuration ---
                speech_key = current_app.config.get('AZURE_SPEECH_KEY')
                service_region = current_app.config.get('AZURE_REGION')
                if not speech_key or not service_region:
                     logging.error("Azure Speech Key or Region not configured!")
                     emit('join_error', {'error': 'Azure Speech not configured on server'}, room=room)
                     leave_room(room) # Leave room if config fails
                     return

                speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
                speech_config.speech_recognition_language = source_language
                # Optional: Add profanity masking if needed
                # speech_config.set_profanity(speechsdk.ProfanityOption.Masked)
                logging.debug(f"SpeechConfig created for language: {source_language}")

                # --- Audio Stream Setup ---
                # Use PushAudioInputStream for streaming data chunks
                audio_stream = speechsdk.audio.PushAudioInputStream()
                audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)
                logging.debug("PushAudioInputStream and AudioConfig created")

                # --- Create Recognizer ---
                recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
                logging.debug("SpeechRecognizer created")

                # --- Connect Callbacks ---
                # Use lambda to pass room_id to handlers
                recognizer.recognizing.connect(lambda evt: handle_intermediate_result(evt, room))
                recognizer.recognized.connect(lambda evt: handle_final_result(evt, room))
                recognizer.session_started.connect(lambda evt: handle_session_started(evt, room))
                recognizer.session_stopped.connect(lambda evt: handle_session_stopped(evt, room))
                recognizer.canceled.connect(lambda evt: handle_canceled(evt, room))
                logging.debug("Connected Azure SDK event handlers")

                # --- Store Recognizer Info ---
                translation_service = get_translation_service()
                active_recognizers[room] = {
                    'recognizer': recognizer,
                    'stream': audio_stream,
                    'translation_service': translation_service,
                    'target_languages': target_languages,
                    'admin_sid': request.sid # Store the SID of the user who initiated
                }
                logging.info(f"Stored recognizer info for room {room}")

                # --- Start Recognition ---
                recognizer.start_continuous_recognition_async()
                logging.info(f"Started continuous recognition for room {room}")

            except Exception as e:
                logging.error(f"Failed to initialize Azure Speech for room {room}: {e}", exc_info=True)
                emit('join_error', {'error': f'Failed to initialize speech recognition: {e}'}, room=room)
                if room in active_recognizers: # Clean up partial setup if error occurred
                    cleanup_recognizer(room)
                leave_room(room) # Leave room on error
        else:
            logging.info(f"Client {request.sid} joined existing room {room}. Recognizer already active.")


@socketio.on('leave')
def on_leave(data):
    """Handles client leaving a room."""
    room = data.get('room')
    if not room:
        logging.error(f"Leave request from {request.sid} missing room ID")
        return

    leave_room(room)
    logging.info(f"Client {request.sid} left room {room}")

    # --- Decide on cleanup logic ---
    # Simple approach: If the SID leaving matches the stored admin SID, clean up.
    with recognizer_lock:
        recognizer_info = active_recognizers.get(room)
        if recognizer_info and recognizer_info.get('admin_sid') == request.sid:
            logging.info(f"Admin {request.sid} left room {room}. Cleaning up recognizer.")
            cleanup_recognizer(room)
        elif not recognizer_info:
             logging.warning(f"Leave event for room {room}, but no active recognizer found.")
        else:
             logging.info(f"Non-admin client {request.sid} left room {room}. Recognizer continues.")


@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Receives audio chunk and pushes it to the Azure stream."""
    room = data.get('room')
    chunk = data.get('audio_chunk') # Key matches frontend

    if not room or not chunk:
        logging.error(f"Received invalid audio_chunk data from {request.sid} (Room: {room}, Chunk type: {type(chunk)})")
        return

    #logging.debug(f"Received audio chunk for room {room} from {request.sid}, size: {len(chunk)}")

    with recognizer_lock:
        recognizer_info = active_recognizers.get(room)

    if recognizer_info and recognizer_info.get('stream'):
        stream = recognizer_info['stream']
        try:
            stream.write(chunk)
            #logging.debug(f"Wrote {len(chunk)} bytes to stream for room {room}")
        except Exception as e:
            logging.error(f"Error writing to audio stream for room {room}: {e}", exc_info=True)
            # Consider cleaning up if stream is broken
            # cleanup_recognizer(room)
    elif not recognizer_info:
        logging.warning(f"Received audio chunk for room {room}, but no active recognizer found. Ignoring.")
    elif not recognizer_info.get('stream'):
         logging.error(f"Received audio chunk for room {room}, but stream object is missing!")


# --- Optional: Add back the test handlers if needed ---
@socketio.on('ping_test')
def handle_ping_test(data):
    logging.info(f"Received ping test from {request.sid}: {data}")
    emit('pong_test', {'message': 'Server received your test', 'sid': request.sid})

# Keep the translate_text handler if needed for non-realtime requests
@socketio.on('translate_text')
def handle_translate_text(data):
    text = data.get('text')
    source_language = data.get('source_language') # e.g., 'lv' or 'lv-LV'
    target_languages = data.get('target_languages', []) # e.g., ['en', 'en-US']

    if not text or not target_languages:
        logging.error("Translate text request missing text or target languages.")
        emit('translation_error', {'error': 'Missing text or target_languages'})
        return

    logging.info(f"Received translate_text request for '{text}' from {source_language} to {target_languages}")
    translation_service = get_translation_service()

    if not translation_service:
         emit('translation_error', {'error': 'Translation service unavailable'})
         return

    for target_lang in target_languages:
        # Map language codes if necessary
        target_lang_deepl = translation_service.map_language_code(target_lang, 'deepl')
        source_lang_deepl = translation_service.map_language_code(source_language, 'deepl') if source_language else None

        if not target_lang_deepl:
            logging.warning(f"Could not map target language {target_lang} for DeepL.")
            continue

        try:
            translated_text = translation_service.translate(
                text,
                target_lang=target_lang_deepl,
                source_lang=source_lang_deepl # Allow DeepL auto-detect if None
            )
            if translated_text:
                # Emit back to the specific client who requested, not the whole room
                emit('translation_result', {
                    'original_text': text,
                    'target_language': target_lang,
                    'translated_text': translated_text
                }) # No room= specified, sends to requester
                logging.info(f"Sent translation result ({target_lang}) to {request.sid}")
            else:
                logging.warning(f"Translation (manual request) to {target_lang} returned empty result.")

        except Exception as e:
            logging.error(f"Error during manual translation to {target_lang}: {e}", exc_info=True)
            emit('translation_error', {'language': target_lang, 'error': str(e)}) 