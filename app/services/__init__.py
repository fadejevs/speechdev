import logging
from .translation_service import TranslationService
from .speech_service import SpeechService
# Import other services if needed

logger = logging.getLogger(__name__)

def initialize_services(app):
    """Initializes and attaches services to the Flask app instance."""
    logger.info("--- Initializing services ---")
    try:
        # Initialize your services here
        app.translation_service = TranslationService(app.config)
        app.speech_service = SpeechService() # Assuming SpeechService takes no args or gets config from env/app.config
        # Initialize other services and attach them to 'app'
        # e.g., app.firebase_service = FirebaseService()

        logger.info("Translation Service initialized.")
        logger.info("Speech Service initialized.")
        # Log other service initializations
    except Exception as e:
        logger.error(f"Failed to initialize one or more services: {e}", exc_info=True)
        # Decide if you want to raise the error or allow the app to continue partially functional
        raise # Or handle differently 