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
from .services import initialize_services # Make sure this import exists

# Load environment variables
load_dotenv()

# Define socketio globally but without initializing it here
socketio = SocketIO()

# --- Logging Configuration ---
# This is a standard configuration that should work.
# It includes the required 'version': 1 and sets up basic console logging.
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False, # Keep existing loggers (like gunicorn's)
    'formatters': {
        'standard': {
            # Define how log messages will look
            'format': '[%(asctime)s] [%(levelname)s] [%(name)s] [%(module)s:%(lineno)d] %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S %z' # Example date format
        },
    },
    'handlers': {
        'console': {
            # Send logs to standard output (visible in Render logs)
            'class': 'logging.StreamHandler',
            'formatter': 'standard', # Use the format defined above
            'stream': 'ext://sys.stdout',
        },
    },
    'loggers': {
        # Configure the root logger (handles logs from libraries unless overridden)
        '': {
            'handlers': ['console'], # Use the console handler defined above
            'level': 'INFO',         # Log INFO, WARNING, ERROR, CRITICAL
            'propagate': True        # Allow messages to propagate to ancestor loggers (if any)
        },
        # Configure the logger specifically for your Flask app
        'app': {
             'handlers': ['console'],
             'level': 'INFO',
             'propagate': False # Don't send 'app' logs to the root logger too
        },
         # Configure Gunicorn's error logger (good practice)
        'gunicorn.error': {
            'level': 'INFO',
            'handlers': ['console'],
            'propagate': False, # Don't duplicate Gunicorn logs
        },
        # Configure Flask-SocketIO's logger
        'socketio': {
            'level': 'INFO', # Set to DEBUG for more verbose SocketIO logs
            'handlers': ['console'],
            'propagate': False,
        },
        # Configure the underlying Engine.IO logger
        'engineio': {
            'level': 'INFO', # Set to DEBUG for more verbose Engine.IO logs
            'handlers': ['console'],
            'propagate': False,
        }
    }
}
# Apply the logging configuration defined above
dictConfig(LOGGING_CONFIG)

# Get the logger for the current module (app/__init__.py)
# Do this *after* dictConfig
logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    """
    Application Factory Pattern
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure Flask's logger:
    # Use the logger configured by dictConfig.
    # Check if Gunicorn handlers are present and if Flask logger has none,
    # then adopt Gunicorn's handlers. This helps unify logging when run via Gunicorn.
    gunicorn_logger = logging.getLogger('gunicorn.error')
    if gunicorn_logger.hasHandlers() and not app.logger.hasHandlers():
         app.logger.handlers = gunicorn_logger.handlers
         app.logger.setLevel(gunicorn_logger.level)
         logger.info("--- create_app --- Configured Flask logger to use Gunicorn handlers.")
    else:
         # Flask logger should have been configured by dictConfig via the 'app' or '' logger.
         logger.info("--- create_app --- Flask logger configured by dictConfig. Level: %s", logging.getLevelName(app.logger.level))

    # Initialize extensions
    CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all origins for now

    # Initialize services BEFORE registering blueprints/routes that use them
    try:
        initialize_services(app) # Ensure this is called
        logger.info("Services initialized successfully via initialize_services.")
        # Log details about the initialized services if helpful
        logger.info(f"Translation Service attached in create_app: Type={type(app.translation_service)}, Service={getattr(app.translation_service, 'service_type', 'N/A')}")
        logger.info(f"Speech Service attached in create_app: Type={type(app.speech_service)}")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to initialize services during app creation: {e}", exc_info=True)
        # Depending on severity, you might want to exit or raise the exception
        raise # Re-raise to prevent app starting in broken state

    # Initialize SocketIO AFTER service initialization
    # Crucially, import websocket routes *after* socketio is initialized
    # and services are attached to the app object that socketio will use.
    socketio.init_app(app, async_mode='gevent', cors_allowed_origins="*") # Or specific origins
    logger.info(f"SocketIO initialized. Object ID: {id(socketio)}")

    # Register Blueprints
    try:
        from .routes.main import main_bp
        from .routes.speech import speech_bp
        # from .routes.firebase import firebase_bp # If you have it

        app.register_blueprint(main_bp)
        app.register_blueprint(speech_bp, url_prefix='/speech')
        # app.register_blueprint(firebase_bp, url_prefix='/firebase')
        logger.info("--- create_app --- Blueprints registered.")
    except Exception as e:
        logger.error(f"--- create_app --- Failed to register blueprints: {e}", exc_info=True)

    # --- Import and Register WebSocket Handlers ---
    # Import websocket routes LAST, so they can use the initialized socketio object
    # and access services via current_app
    try:
        with app.app_context(): # Ensure routes are imported within app context
            from .routes import websocket # Import the websocket module
            logger.info(f"Imported websocket routes LAST. SocketIO object ID used by websocket.py: {id(websocket.socketio)}") # Check IDs match

    except Exception as e:
        logger.error(f"--- create_app --- Failed to import websocket routes: {e}", exc_info=True)

    logger.info("--- create_app --- Flask app creation finished.")
    return app

# --- Create App Instance ---
# Call create_app() at the module level so wsgi.py can import app and socketio
# Any errors during create_app will happen here during import time
logger.info("--- __init__.py --- Calling create_app() at module level...")
app = create_app()
logger.info(f"--- __init__.py --- App created at module level. App object ID: {id(app)}, SocketIO object ID: {id(socketio)}")

# --- Remove the duplicate create_app definition and the __main__ block ---
# (Ensure these are removed if they still exist) 