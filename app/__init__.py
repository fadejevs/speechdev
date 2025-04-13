import logging
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import os
from app.services.translation_service import TranslationService

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize translation service at module level
translation_service = None

def create_app():
    app = Flask(__name__)
    
    # --- Load Configuration ---
    # Option 2: Config file inside the 'app' folder (app/config.py)
    config_path = os.path.join(os.path.dirname(__file__), 'config.py')
    
    if os.path.exists(config_path):
        # Use from_pyfile with the absolute path determined
        app.config.from_pyfile(config_path)
        logging.info(f"Loaded configuration from: {config_path}")
    else:
        logging.warning(f"Configuration file not found at: {config_path}. Using defaults or environment variables if set.")
    
    # Fallback or default secret key if not in config
    app.config.setdefault('SECRET_KEY', 'a_default_secret_key_if_not_in_config')
    
    # Configure CORS - allow all origins
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize SocketIO without the problematic parameters
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    # Initialize translation service
    global translation_service
    translation_service = TranslationService()
    app.config['TRANSLATION_SERVICE'] = translation_service
    logging.info(f"Initialized TranslationService with service type: {translation_service.service}")
    
    # Import routes after app is created to avoid circular imports
    from app.routes import main, speech, websocket
    
    # --- Register Blueprints ---
    # Import the blueprint variable from your route file
    from app.routes.speech import speech_bp
    from app.routes.websocket import socketio as socketio_bp
    from app.routes.translation import translation_bp
    
    # Register the blueprint with the Flask app
    app.register_blueprint(speech_bp)
    app.register_blueprint(translation_bp)
    logging.info("Registered Blueprints")
    
    @app.before_request
    def log_request_info():
        """Log information about the incoming request before routing."""
        logging.debug(f"--- Before Request ---")
        logging.debug(f"Path: {request.path}")
        logging.debug(f"Method: {request.method}")
        logging.debug(f"Headers:\n{request.headers}")
    
    # --- Optional: Add after_request logging ---
    @app.after_request
    def log_response_info(response):
        logging.debug('--- After Request ---')
        logging.debug('Status Code: %s', response.status)
        return response
    
    # --- SocketIO Event Handlers (if any directly in init) ---
    @socketio.on('connect')
    def handle_connect():
        logging.info('Client connected: %s', request.sid)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logging.info('Client disconnected: %s', request.sid)
    
    return app, socketio

# Create the app and socketio instances
app, socketio = create_app()

# --- COMMENT OUT OR DELETE THE if __name__ BLOCK ---
# if __name__ == '__main__':
#     # This block is okay when running 'python3 main.py' or 'python3 app/__init__.py'
#     # It will be ignored when using 'flask run'
#     socketio.run(app, host='127.0.0.1', port=5000, debug=True)
# --- END CHANGE --- 

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # ... existing initialization code ...
    
    # Initialize translation service
    translation_service = TranslationService()
    app.config['TRANSLATION_SERVICE'] = translation_service
    app.logger.info(f"Initialized TranslationService with service type: {translation_service.service}")
    
    # ... rest of your initialization code ...
    
    return app 