import logging
import os
from logging.config import dictConfig

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from .config import Config
from app.services.translation_service import TranslationService
from app.services.speech_service import SpeechService # Import SpeechService

# Load environment variables
load_dotenv()

# Define socketio globally but without initializing it here
socketio = SocketIO()

# --- Logging Configuration ---
# (Keep your existing logging config)
LOGGING_CONFIG = {
    # ... your dictConfig ...
}
dictConfig(LOGGING_CONFIG)

def create_app(config_class=Config):
    """
    Application Factory Pattern
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure logging using Gunicorn's logger if available
    gunicorn_logger = logging.getLogger('gunicorn.error')
    if gunicorn_logger.handlers:
        app.logger.handlers = gunicorn_logger.handlers
        app.logger.setLevel(gunicorn_logger.level)
        app.logger.info("--- create_app --- Configured Flask logger to use Gunicorn handlers and set level to %s.", logging.getLevelName(app.logger.level))
    else:
        # Fallback basic config if not run with Gunicorn or Gunicorn logger not found
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        app.logger.info("--- create_app --- Gunicorn logger not found, using basicConfig.")

    # Initialize extensions
    CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all origins for now

    # Initialize SocketIO with the app instance *before* importing routes that use it
    # Pass logger=True and engineio_logger=True for more verbose SocketIO logs
    socketio.init_app(
        app,
        async_mode='gevent',
        cors_allowed_origins="*", # Be specific in production
        logger=True,              # Enable Flask-SocketIO logger
        engineio_logger=True      # Enable Engine.IO logger
    )
    app.logger.info(f"--- create_app --- Initialized SocketIO. Object ID: {id(socketio)}")

    # Initialize Services
    # (Keep your service initializations)
    # ... service init ...
    app.logger.info(f"Translation Service initialized in create_app: Type={getattr(app, 'translation_service', None)}")
    app.logger.info(f"Speech Service initialized in create_app: Configured={hasattr(app, 'speech_service')}")

    # Register Blueprints
    from .routes.main import main_bp
    from .routes.speech import speech_bp
    # from .routes.firebase import firebase_bp # If you have it

    app.register_blueprint(main_bp)
    app.register_blueprint(speech_bp, url_prefix='/speech')
    # app.register_blueprint(firebase_bp, url_prefix='/firebase')

    # --- MOVE WEBSOCKET IMPORT HERE ---
    # Import websocket routes *after* everything else, especially SocketIO init
    with app.app_context(): # Ensure context for logger inside websocket.py if needed
        from .routes import websocket # This executes the decorators
        app.logger.info(f"--- create_app --- Imported websocket routes LAST. SocketIO object ID used by websocket.py: {id(websocket.socketio)}")

    app.logger.info("Flask app created and configured.")
    return app

# --- Create App Instance ---
# Call create_app() at the module level so wsgi.py can import app and socketio
app = create_app()

# --- Remove the duplicate create_app definition and the __main__ block ---
# (Ensure these are removed if they still exist) 