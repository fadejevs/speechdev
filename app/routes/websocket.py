from flask_socketio import emit, join_room, leave_room
from flask import request, current_app, session
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

# --- Global State Management ---
# Dictionary to hold active recognizers and streams per room
# Structure: { room_id: {'recognizer': SpeechRecognizer, 'stream': PushAudioInputStream, 'translation_service': TranslationService, 'target_languages': [] }}
active_recognizers = {}
recognizer_lock = threading.Lock() # To protect access to the dictionary

# Define session_state globally (if this is how you manage state)
session_state = {}

# --- Helper Function to Get Services (Corrected) ---
# Ensures services are accessed within app context when needed
def get_services():
    try:
        # Access services attached directly to the app instance
        translation_service = current_app.translation_service
        speech_service = current_app.speech_service
        # Basic check if services were initialized
        if not translation_service or not speech_service:
             logging.error("One or more services were not initialized correctly on the app.")
             return None, None
        return translation_service, speech_service
    except RuntimeError:
        # This happens if code tries to access current_app outside a request/app context
        # This function should ideally only be called within context (e.g., inside socket handlers)
        logging.error("Attempted to access services outside of Flask app context!")
        return None, None
    except AttributeError:
        # This happens if services weren't attached correctly in __init__
        logging.error("Services not found on current_app. Check app initialization.")
        return None, None

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
    """Handles new client connections."""
    # --- ADD PRINT STATEMENT ---
    print("--- PRINT: Connect Event Start ---", flush=True)
    sid = request.sid
    # --- Log object ID inside handler using app logger ---
    current_app.logger.info(f"--- Connect Event Start --- Client connected: {sid}. Using SocketIO object ID: {id(socketio)}")

    try:
        # Attempt to get services early to catch potential issues
        translation_service, speech_service = get_services()
        if not translation_service or not speech_service:
            current_app.logger.error(f"Services not properly initialized for SID: {sid}. Aborting connect handler.") # Use app logger
            print(f"--- PRINT: Connect Error - Services not initialized for SID: {sid} ---", flush=True) # Add print
            return # Exit the handler early

        current_app.logger.info(f"Services retrieved successfully for SID: {sid}") # Use app logger
        print(f"--- PRINT: Connect - Services retrieved for SID: {sid} ---", flush=True) # Add print

        # Store initial state or language settings if needed
        # session_state[sid] = {'recognizer': None, 'push_stream': None, 'target_language': 'en', 'source_language': 'en-US'} # Temporarily comment out state
        current_app.logger.info(f"Skipping session state creation for SID: {sid}") # Use app logger

        # Emit success message
        emit('connection_success', {'message': 'Connected successfully', 'sid': sid})
        current_app.logger.info(f"Sent 'connection_success' to SID: {sid}") # Use app logger
        print(f"--- PRINT: Connect - Sent 'connection_success' to SID: {sid} ---", flush=True) # Add print

    except Exception as e:
        current_app.logger.error(f"--- ERROR in connect handler for SID {sid} ---: {e}", exc_info=True) # Use app logger
        print(f"--- PRINT: Connect Exception for SID {sid}: {e} ---", flush=True) # Add print
        emit('service_error', {'error': 'Server error during connection setup.'})

    current_app.logger.info(f"--- Connect Event End --- Client: {sid}") # Use app logger
    print(f"--- PRINT: Connect Event End --- Client: {sid}", flush=True) # Add print

@socketio.on('disconnect')
def handle_disconnect():
    """Handles client disconnections."""
    # --- ADD PRINT STATEMENT ---
    print("--- PRINT: Disconnect Event Start ---", flush=True)
    sid = request.sid
    # Use app logger
    current_app.logger.info(f"--- Disconnect Event Start --- Client disconnecting: {sid}. Using SocketIO object ID: {id(socketio)}")

    # Clean up resources associated with the session
    state = session_state.pop(sid, None)
    if state:
        current_app.logger.info(f"Cleaning up resources for SID: {sid}")
        print(f"--- PRINT: Disconnect - Cleaning up for SID: {sid} ---", flush=True) # Add print
        # Stop recognition if it's running
        recognizer = state.get('recognizer')
        push_stream = state.get('push_stream')
        if recognizer:
            try:
                recognizer.stop_continuous_recognition_async()
                current_app.logger.info(f"Stopped recognizer for SID: {sid}")
            except Exception as e:
                current_app.logger.error(f"Error stopping recognizer for SID {sid}: {e}", exc_info=True)
        # Close the push stream
        if push_stream:
            try:
                push_stream.close()
                current_app.logger.info(f"Closed push stream for SID: {sid}")
            except Exception as e:
                current_app.logger.error(f"Error closing push stream for SID {sid}: {e}", exc_info=True)
    else:
        current_app.logger.info(f"No state found to clean up for SID: {sid}")
        print(f"--- PRINT: Disconnect - No state for SID: {sid} ---", flush=True) # Add print

    current_app.logger.info(f"--- Disconnect Event End --- Client: {sid}")
    print(f"--- PRINT: Disconnect Event End --- Client: {sid}", flush=True) # Add print


@socketio.on('join_room')
def on_join(data):
    sid = request.sid
    room_id = data.get('room_id')
    target_languages = data.get('target_languages', []) # e.g., ['es', 'fr']
    source_language = data.get('source_language', 'en-US') # e.g., 'en-US'

    if not room_id:
        logging.error(f"Join attempt failed for {sid}: No room_id provided.")
        emit('error', {'message': 'room_id is required'}, room=sid)
        return

    join_room(room_id)
    logging.info(f"Client {sid} joined room {room_id}. Source: {source_language}, Targets: {target_languages}")
    emit('room_joined', {'room_id': room_id, 'message': f'Successfully joined room {room_id}'}, room=sid)

    # --- Initialize Recognizer for the Room (if not already) ---
    with recognizer_lock:
        if room_id not in active_recognizers:
            logging.info(f"Initializing recognizer for room {room_id}")
            translation_service, speech_service = get_services() # Use helper

            if not speech_service or not speech_service.speech_config:
                logging.error(f"Cannot initialize recognizer for room {room_id}: SpeechService not configured.")
                emit('error', {'message': 'Backend speech service not ready'}, room=room_id)
                # Maybe leave room?
                return

            try:
                # Create a push stream for audio data
                stream = speechsdk.audio.PushAudioInputStream()
                audio_config = speechsdk.audio.AudioConfig(stream=stream)

                # Configure for continuous translation recognition
                # Use the speech_config from the initialized service
                # Ensure subscription and region are accessed correctly from the service's config
                azure_key = speech_service.speech_config.subscription
                azure_region = speech_service.speech_config.region

                translation_config = speechsdk.translation.SpeechTranslationConfig(
                    subscription=azure_key,
                    region=azure_region
                )
                translation_config.speech_recognition_language = source_language
                for lang in target_languages:
                    # Map to Azure's expected format if needed (e.g., 'es' from 'es-ES')
                    azure_target_lang = lang.split('-')[0] if '-' in lang else lang # Handle cases like 'es' vs 'es-ES'
                    translation_config.add_target_language(azure_target_lang)

                recognizer = speechsdk.translation.TranslationRecognizer(
                    translation_config=translation_config,
                    audio_config=audio_config
                )

                # --- Define Callbacks ---
                def recognizing_cb(evt: speechsdk.translation.TranslationRecognitionEventArgs):
                    # Handle intermediate results if needed
                    if evt.result.reason == speechsdk.ResultReason.TranslatingSpeech:
                         translations = evt.result.translations
                         logging.debug(f"TRANSLATING in room {room_id}: {translations}")
                         # Emit intermediate results if desired
                         # socketio.emit('recognizing', {'translations': translations}, room=room_id)

                def recognized_cb(evt: speechsdk.translation.TranslationRecognitionEventArgs):
                    if evt.result.reason == speechsdk.ResultReason.TranslatedSpeech:
                        recognition = evt.result.text # Original recognized text
                        translations = evt.result.translations # Dictionary: {'de': 'text', 'fr': 'text'}
                        logging.info(f"RECOGNIZED in room {room_id}: '{recognition}' -> {translations}")
                        # Emit final recognized segment and its translations
                        socketio.emit('recognized_speech', {
                            'recognition': recognition,
                            'translations': translations,
                            'source_language': source_language # Include source lang context
                        }, room=room_id)
                    elif evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
                         # This happens if only recognition occurs (no translation targets?)
                         logging.info(f"RECOGNIZED (no translation) in room {room_id}: {evt.result.text}")
                         socketio.emit('recognized_speech', {
                             'recognition': evt.result.text,
                             'translations': {},
                             'source_language': source_language
                         }, room=room_id)
                    elif evt.result.reason == speechsdk.ResultReason.NoMatch:
                        logging.warning(f"NOMATCH in room {room_id}: Speech could not be recognized.")
                        # Optionally emit a no-match event
                        # socketio.emit('no_match', {'message': 'No speech recognized'}, room=room_id)

                def canceled_cb(evt: speechsdk.translation.TranslationRecognitionCanceledEventArgs):
                     logging.error(f"RECOGNITION CANCELED in room {room_id}: Reason={evt.reason}")
                     if evt.reason == speechsdk.CancellationReason.Error:
                         logging.error(f"CANCELED ErrorDetails={evt.error_details}")
                     # Stop recognition and clean up for this room
                     stop_recognition(room_id) # Call cleanup helper
                     socketio.emit('recognition_error', {'error': f'Recognition canceled: {evt.reason}'}, room=room_id)

                def session_started_cb(evt):
                    logging.info(f'Recognition SESSION STARTED in room {room_id}: {evt}')

                def session_stopped_cb(evt):
                    logging.info(f'Recognition SESSION STOPPED in room {room_id}: {evt}')
                    # Clean up when session stops naturally or due to error
                    stop_recognition(room_id) # Call cleanup helper


                # --- Connect Callbacks ---
                recognizer.recognizing.connect(recognizing_cb)
                recognizer.recognized.connect(recognized_cb)
                recognizer.canceled.connect(canceled_cb)
                recognizer.session_started.connect(session_started_cb)
                recognizer.session_stopped.connect(session_stopped_cb)

                # --- Start Continuous Recognition ---
                recognizer.start_continuous_recognition_async()
                logging.info(f"Started continuous recognition for room {room_id}")

                # Store recognizer and stream
                active_recognizers[room_id] = {
                    'recognizer': recognizer,
                    'stream': stream,
                    'target_languages': target_languages,
                    'source_language': source_language
                }

            except Exception as e:
                logging.error(f"Failed to initialize recognizer for room {room_id}: {e}", exc_info=True)
                emit('error', {'message': f'Failed to start recognition: {e}'}, room=room_id)


@socketio.on('leave_room')
def on_leave(data):
    sid = request.sid
    room_id = data.get('room_id')
    if not room_id:
        logging.warning(f"Leave attempt failed for {sid}: No room_id provided.")
        return

    leave_room(room_id)
    logging.info(f"Client {sid} left room {room_id}")
    emit('room_left', {'room_id': room_id, 'message': f'Successfully left room {room_id}'}, room=sid)

    # Check if room is now empty and stop recognizer if so
    # This requires tracking users per room, which SocketIO does internally
    # Need to access the server's room data correctly
    room_users = socketio.server.manager.rooms.get('/', {}).get(room_id)
    if not room_users or len(room_users) == 0:
         logging.info(f"Room {room_id} is empty. Stopping recognition.")
         stop_recognition(room_id) # Call cleanup helper


@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    sid = request.sid
    # Use the keys sent by the frontend
    room_id = data.get('room')
    audio_chunk = data.get('audio_chunk') # Expecting raw bytes from 'audio_chunk' key

    # The rest of the validation logic remains similar
    if not room_id or not isinstance(audio_chunk, bytes) or len(audio_chunk) == 0:
        logging.warning(f"Received invalid audio chunk data from {sid}. Room: {room_id}, Chunk type: {type(audio_chunk)}, Chunk size: {len(audio_chunk) if isinstance(audio_chunk, bytes) else 'N/A'}")
        # Decide if you want to emit an error back to the client here
        # emit('error', {'message': 'Invalid audio chunk received'}, room=sid)
        return # Stop processing

    # Now you have the correct room_id and audio_chunk (as bytes)
    # Proceed with pushing to the stream

    with recognizer_lock:
        recognizer_data = active_recognizers.get(room_id)

    if recognizer_data and recognizer_data['stream']:
        try:
            # logging.debug(f"Pushing {len(audio_chunk)} bytes to stream for room {room_id}")
            recognizer_data['stream'].write(audio_chunk)
        except Exception as e:
            logging.error(f"Error writing to audio stream for room {room_id}: {e}", exc_info=True)
            stop_recognition(room_id) # Stop on stream error
            # Consider sending error to the specific room or SID
            emit('recognition_error', {'error': 'Audio stream error processing chunk'}, room=room_id)
    else:
        logging.warning(f"No active recognizer or stream found for room {room_id} to handle audio chunk from {sid}")
        # Optionally send an error back to the client
        emit('error', {'message': 'Recognition not active for this room'}, room=sid)


@socketio.on('stop_recognition')
def handle_stop_recognition(data):
    """Client explicitly requests to stop."""
    sid = request.sid
    room_id = data.get('room_id')
    logging.info(f"Received stop request from {sid} for room {room_id}")
    if room_id:
        stop_recognition(room_id) # Call cleanup helper


# --- Helper to Stop and Clean Up Recognition ---
def stop_recognition(room_id):
    with recognizer_lock:
        if room_id in active_recognizers:
            recognizer_data = active_recognizers.pop(room_id) # Remove from active list
            recognizer = recognizer_data.get('recognizer')
            stream = recognizer_data.get('stream')
            logging.info(f"Stopping recognition and cleaning up for room {room_id}...")

            if recognizer:
                try:
                    # Stop recognition
                    # Use get() to avoid waiting indefinitely if already stopped/cancelled
                    recognizer.stop_continuous_recognition_async().get()
                    logging.info(f"Stopped continuous recognition async for room {room_id}")

                    # Disconnect callbacks to prevent potential issues during cleanup
                    recognizer.recognizing.disconnect_all()
                    recognizer.recognized.disconnect_all()
                    recognizer.canceled.disconnect_all()
                    recognizer.session_started.disconnect_all()
                    recognizer.session_stopped.disconnect_all()
                    logging.debug(f"Disconnected all callbacks for room {room_id}")

                except Exception as e:
                    logging.error(f"Error during recognizer stop/cleanup for room {room_id}: {e}")

            if stream:
                try:
                    # Close the audio stream
                    stream.close()
                    logging.info(f"Closed audio stream for room {room_id}")
                except Exception as e:
                    logging.error(f"Error closing stream for room {room_id}: {e}")

            logging.info(f"Cleanup complete for room {room_id}")
            # Notify clients in the room that recognition has stopped
            socketio.emit('recognition_stopped', {'room_id': room_id}, room=room_id)
        else:
             logging.warning(f"Stop request for room {room_id}, but no active recognizer found.")


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
    translation_service = get_services()[0]

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

# --- ADD A SIMPLE TEST EVENT HANDLER ---
@socketio.on('test_event')
def handle_test_event(data):
    # --- ADD PRINT STATEMENT ---
    print(f"--- PRINT: Received 'test_event' --- Data: {data}", flush=True)
    sid = request.sid
    # --- Log object ID inside handler using app logger ---
    current_app.logger.info(f"--- Received 'test_event' from SID {sid} --- Data: {data}. Using SocketIO object ID: {id(socketio)}") # Use app logger
    emit('test_response', {'message': 'Test event received!', 'your_data': data}, room=sid)
    current_app.logger.info(f"--- Sent 'test_response' to SID {sid} ---") # Use app logger
    print(f"--- PRINT: Sent 'test_response' to SID {sid} ---", flush=True) # Add print
# --- END TEST EVENT HANDLER ---

@socketio.on('start_recognition')
def handle_start_recognition(data):
    sid = request.sid
    room_id = data.get('room_id')
    # Add this log line to see if the event even arrives
    logging.info(f"--- START RECOGNITION EVENT RECEIVED --- SID: {sid}, Room ID: {room_id}, Data: {data}")
    source_language = data.get('source_language', 'en-US') # Default to en-US
    target_languages = data.get('target_languages', []) # Default to empty list
    # ... rest of the function ... 