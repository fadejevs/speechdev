import firebase_admin
from firebase_admin import credentials, firestore
from flask import current_app # Import current_app to access config safely
import logging # Use logging

# --- DO NOT IMPORT 'app' DIRECTLY ---
# from app import app # REMOVE THIS LINE

class FirebaseService:
    def __init__(self):
        """
        Initializes the service. Does not initialize Firebase Admin SDK here
        to avoid needing app context during initial import.
        """
        self.db = None # Initialize db attribute to None
        self._initialized = False # Flag to track initialization

    def _ensure_initialized(self):
        """
        Initializes the Firebase Admin SDK using configuration from the
        current application context if it hasn't been initialized yet.
        This should be called before any Firestore operation.
        """
        # Use the flag to prevent multiple initialization attempts
        # Check firebase_admin._apps as a fallback safety measure
        if not self._initialized and not firebase_admin._apps:
            try:
                # Access config ONLY when needed (inside a request or app context)
                # Ensure 'FIREBASE_CREDENTIALS_PATH' is set in your app/config.py
                cred_path = current_app.config.get('FIREBASE_CREDENTIALS_PATH')
                if not cred_path:
                    # Use Flask's logger
                    current_app.logger.error("FIREBASE_CREDENTIALS_PATH is not set in Flask config!")
                    return False # Indicate failure

                # Check if the credentials file exists
                import os
                if not os.path.exists(cred_path):
                    current_app.logger.error(f"Firebase credentials file not found at: {cred_path}")
                    return False # Indicate failure

                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client() # Get the client AFTER initialization
                self._initialized = True # Set the flag
                current_app.logger.info("Firebase Admin SDK initialized successfully.")
                return True
            except ValueError as ve:
                 # Catch specific error if cred_path is invalid format or file doesn't exist
                 current_app.logger.error(f"Firebase credentials path error: {ve}")
                 return False
            except Exception as e:
                # Catch any other initialization errors
                current_app.logger.error(f"Failed to initialize Firebase Admin SDK: {e}", exc_info=True) # Log traceback
                return False # Indicate failure
        elif firebase_admin._apps:
             # If already initialized (e.g., by another instance or previous call), get the client
             if self.db is None:
                 self.db = firestore.client()
             self._initialized = True # Ensure flag is set
             return True
        else:
            # Already initialized by this instance
            return True


    def get_db(self):
        """Gets the Firestore client, ensuring initialization first."""
        if self._ensure_initialized():
            return self.db
        else:
            # Log error if initialization failed
            current_app.logger.error("Cannot get Firestore client because Firebase SDK initialization failed.")
            return None

    def store_transcript(self, text, transcript_type, source_lang='en', translated_text=None, target_lang=None):
        """Store speech/translation transcript"""
        db = self.get_db()
        if not db:
            # Error already logged by get_db()
            return None # Indicate failure

        try:
            transcript_data = {
                'original_text': text,
                'source_language': source_lang,
                'target_language': target_lang,
                'translated_text': translated_text,
                'timestamp': firestore.SERVER_TIMESTAMP, # Use server timestamp
                'type': transcript_type
            }
            # Use add() to let Firestore generate the ID
            _, doc_ref = db.collection('transcripts').add(transcript_data)
            current_app.logger.info(f"Transcript stored with ID: {doc_ref.id}")
            return doc_ref.id # Return the generated document ID
        except Exception as e:
            current_app.logger.error(f"Error storing transcript in Firestore: {e}", exc_info=True)
            return None # Indicate failure

    def get_transcripts(self, limit=10):
        """Get recent transcripts"""
        db = self.get_db()
        if not db:
            return [] # Return empty list on failure

        try:
            # Ensure 'timestamp' field exists for ordering
            transcripts_query = db.collection('transcripts').order_by(
                'timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = transcripts_query.stream()

            results = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id # Optionally include the document ID
                # Convert timestamp if needed (it might be a datetime object)
                if 'timestamp' in data and hasattr(data['timestamp'], 'isoformat'):
                     data['timestamp'] = data['timestamp'].isoformat()
                results.append(data)
            return results
        except Exception as e:
            current_app.logger.error(f"Error getting transcripts from Firestore: {e}", exc_info=True)
            return [] # Return empty list on error 