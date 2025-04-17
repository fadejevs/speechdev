import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from .config import Config
from app.services.translation_service import TranslationService
from app.services.speech_service import SpeechService # Import SpeechService

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
    """Construct the core application."""
    app = Flask(__name__)
    app.config.from_object(config_class) # Config loaded here

    # --- Configure Logging to use Gunicorn's logger ---
    gunicorn_logger = logging.getLogger('gunicorn.error')
    if gunicorn_logger.handlers:
        app.logger.handlers = gunicorn_logger.handlers
        # --- Explicitly set level to INFO ---
        app.logger.setLevel(logging.INFO)
        logging.getLogger().handlers = gunicorn_logger.handlers # Also configure root logger
        logging.getLogger().setLevel(logging.INFO) # Also set root logger level
        app.logger.info("--- create_app --- Configured Flask logger to use Gunicorn handlers and set level to INFO.")
    else:
        # Fallback if not run under Gunicorn or Gunicorn logger not found
        logging.basicConfig(level=logging.INFO) # Or use Flask's default
        app.logger.info("--- create_app --- Gunicorn logger not found, using basicConfig fallback.")
        app.logger.setLevel(logging.INFO) # Ensure level is INFO in fallback too
    # --- End Logging Configuration ---

    # Initialize extensions
    CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all origins for simplicity
    # Ensure SECRET_KEY is loaded before initializing SocketIO if it depends on it implicitly
    if not app.config.get('SECRET_KEY') or app.config['SECRET_KEY'] == 'a-very-weak-default-secret-key-CHANGE-ME':
         app.logger.warning("SECRET_KEY is not set or is weak in the environment. Flask sessions and SocketIO may be insecure.") # Use app.logger
         # Optionally raise an error: raise ValueError("Missing or weak SECRET_KEY environment variable.")

    # Enable detailed logging for SocketIO and EngineIO
    socketio.init_app(app, async_mode='gevent', cors_allowed_origins="*", logger=True, engineio_logger=True)
    # --- Log object ID after init ---
    app.logger.info(f"--- create_app --- Initialized SocketIO. Object ID: {id(socketio)}") # Use app.logger

    # --- Initialize Services ---
    # Pass the app's config dictionary to the service constructors
    translation_service = TranslationService(app.config)
    speech_service = SpeechService(app.config) # Initialize SpeechService

    # Attach services to the app context for easier access in routes
    app.translation_service = translation_service
    app.speech_service = speech_service # Attach SpeechService
    app.logger.info(f"Translation Service initialized in create_app: Type={getattr(translation_service, 'service_type', 'N/A')}") # Use app.logger
    app.logger.info(f"Speech Service initialized in create_app: Configured={bool(speech_service.speech_config)}") # Use app.logger

    # --- Import Blueprints/Routes AFTER app and extensions are initialized ---
    with app.app_context():
        from .routes import main, speech, translation # Keep these here
        app.register_blueprint(main.bp)
        app.register_blueprint(speech.speech_bp) # Use speech_bp name
        app.register_blueprint(translation.translation_bp) # Register translation blueprint

        # Explicitly import websocket routes AFTER socketio is initialized with the app
        from .routes import websocket # Import websocket routes here
        app.logger.info(f"--- create_app --- Imported websocket routes AFTER SocketIO init.") # Use app.logger

    app.logger.info("Flask app created and configured.") # Use app.logger
    return app, socketio # Return both app and socketio

# --- Create App Instance ---
# Call create_app() at the module level so wsgi.py can import app and socketio
app, socketio = create_app()

# --- Remove the duplicate create_app definition and the __main__ block ---
# (Ensure these are removed if they still exist) 