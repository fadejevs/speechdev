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

    # Initialize extensions
    CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all origins for simplicity
    # Ensure SECRET_KEY is loaded before initializing SocketIO if it depends on it implicitly
    if not app.config.get('SECRET_KEY') or app.config['SECRET_KEY'] == 'a-very-weak-default-secret-key-CHANGE-ME':
         logging.warning("SECRET_KEY is not set or is weak in the environment. Flask sessions and SocketIO may be insecure.")
         # Optionally raise an error: raise ValueError("Missing or weak SECRET_KEY environment variable.")

    socketio.init_app(app, async_mode='gevent', cors_allowed_origins="*")

    # --- Initialize Services ---
    # Pass the app's config dictionary to the service constructors
    translation_service = TranslationService(app.config)
    speech_service = SpeechService(app.config) # Initialize SpeechService

    # Attach services to the app context for easier access in routes
    app.translation_service = translation_service
    app.speech_service = speech_service # Attach SpeechService
    logging.info(f"Translation Service initialized in create_app: Type={getattr(translation_service, 'service_type', 'N/A')}")
    logging.info(f"Speech Service initialized in create_app: Configured={bool(speech_service.speech_config)}")

    # --- Import Blueprints/Routes AFTER app and extensions are initialized ---
    with app.app_context():
        from .routes import main, speech, websocket, translation # Import translation blueprint too
        app.register_blueprint(main.bp)
        app.register_blueprint(speech.speech_bp) # Use speech_bp name
        app.register_blueprint(translation.translation_bp) # Register translation blueprint
        # WebSocket routes are handled by SocketIO directly

    logging.info("Flask app created and configured.")
    return app, socketio # Return both app and socketio

# --- Create App Instance ---
# Call create_app() at the module level so wsgi.py can import app and socketio
app, socketio = create_app()

# --- Remove the duplicate create_app definition and the __main__ block ---
# (Ensure these are removed if they still exist) 