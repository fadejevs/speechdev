import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from app.config import Config
from app.services.translation_service import TranslationService

# Load environment variables
load_dotenv()

# --- Logging Configuration ---
# (Keep your existing logging setup)
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(level=log_level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.getLogger('engineio').setLevel(logging.WARNING)
logging.getLogger('socketio').setLevel(logging.WARNING)
logging.getLogger('azure').setLevel(logging.WARNING)


# --- Initialize Extensions (without app) ---
# Create the SocketIO instance here, but don't attach it to 'app' yet
socketio = SocketIO()
cors = CORS()
translation_service = None # Initialize as None

def create_app(config_class=Config):
    """Creates and configures the Flask application."""
    global translation_service # Allow modification of the global instance

    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key') # Ensure secret key

    # --- Initialize Services ---
    try:
        translation_service = TranslationService(
            azure_speech_key=app.config.get('AZURE_SPEECH_KEY'),
            azure_region=app.config.get('AZURE_REGION'),
            deepl_api_key=app.config.get('DEEPL_API_KEY'),
            deepl_api_url=app.config.get('DEEPL_API_URL')
        )
        app.config['TRANSLATION_SERVICE'] = translation_service # Store in app config
        logging.info("TranslationService initialized and added to app config.")
    except Exception as e:
        logging.error(f"Failed to initialize TranslationService: {e}", exc_info=True)
        # Decide if the app should fail to start or continue without translation
        # raise e # Option: re-raise the exception to stop startup

    # --- Initialize Flask Extensions with App ---
    # Now attach SocketIO and CORS to the created app instance
    socketio.init_app(app, async_mode='gevent', cors_allowed_origins="*") # Use gevent, allow all origins for now
    cors.init_app(app) # Initialize CORS

    # --- Import Blueprints/Routes AFTER app and extensions are initialized ---
    # This breaks the circular import
    with app.app_context():
        from .routes import main, speech, websocket # Import routes here
        app.register_blueprint(main.bp)
        app.register_blueprint(speech.bp)
        # WebSocket routes are typically handled by SocketIO directly, not registered as blueprints

    logging.info("Flask app created and configured.")
    return app, socketio # Return both app and socketio

# --- Create App Instance ---
# Call create_app() at the module level so wsgi.py can import app and socketio
app, socketio = create_app()

# --- Remove the duplicate create_app definition and the __main__ block ---
# (Ensure these are removed if they still exist) 