import logging
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import os

# Configure basic logging if not already done elsewhere
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# --- Load Configuration ---
# Make sure this path is correct relative to where you run flask

# --- COMMENT OUT OPTION 1 ---
# Option 1: Config file at the same level as the 'app' folder (PROJECT_ROOT/config.py)
# config_path_option1 = os.path.join(os.path.dirname(__file__), '..', 'config.py')

# --- UNCOMMENT AND USE OPTION 2 ---
# Option 2: Config file inside the 'app' folder (app/config.py)
config_path_option2 = os.path.join(os.path.dirname(__file__), 'config.py')

# --- Use the correct path variable ---
config_path = config_path_option2 # Use Option 2 path

if os.path.exists(config_path):
    # Use from_pyfile with the absolute path determined
    app.config.from_pyfile(config_path)
    logging.info(f"Loaded configuration from: {config_path}")
else:
    logging.warning(f"Configuration file not found at: {config_path}. Using defaults or environment variables if set.")
    # Optionally load defaults or raise an error
    # Example: app.config.from_mapping(SECRET_KEY='default_secret_key')

# Fallback or default secret key if not in config
app.config.setdefault('SECRET_KEY', 'a_default_secret_key_if_not_in_config')

# Use the simplest CORS setup - allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Also update SocketIO CORS for consistency
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Register Blueprints ---
# Import the blueprint variable from your route file
from app.routes.speech import speech_bp
from app.routes.websocket import socketio as socketio_bp
# Import other blueprints if you have them
# from app.routes.translation import translation_bp
# from app.routes.tts import tts_bp
# from app.routes.websocket import websocket_bp
# from app.routes.main import main_bp

# Register the blueprint with the Flask app
app.register_blueprint(speech_bp)
# Register other blueprints
# app.register_blueprint(translation_bp)
# app.register_blueprint(tts_bp)
# app.register_blueprint(websocket_bp)
# app.register_blueprint(main_bp)
logging.info("Registered Blueprints")

@app.before_request
def log_request_info():
    """Log information about the incoming request before routing."""
    logging.debug(f"--- Before Request ---")
    logging.debug(f"Path: {request.path}")
    logging.debug(f"Method: {request.method}")
    logging.debug(f"Headers:\n{request.headers}")
    # Be careful logging data in production, okay for debugging
    # logging.debug(f"Body Data: {request.get_data()}")

# --- Optional: Add after_request logging ---
@app.after_request
def log_response_info(response):
    logging.debug('--- After Request ---')
    logging.debug('Status Code: %s', response.status)
    # logging.debug('Response Headers:\n%s', response.headers)
    # Uncomment to log response data (use with caution)
    # logging.debug('Response Data: %s', response.get_data(as_text=True))
    return response

# --- SocketIO Event Handlers (if any directly in init) ---
@socketio.on('connect')
def handle_connect():
    logging.info('Client connected: %s', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    logging.info('Client disconnected: %s', request.sid)

# --- COMMENT OUT OR DELETE THE if __name__ BLOCK ---
# if __name__ == '__main__':
#     # This block is okay when running 'python3 main.py' or 'python3 app/__init__.py'
#     # It will be ignored when using 'flask run'
#     socketio.run(app, host='127.0.0.1', port=5000, debug=True)
# --- END CHANGE --- 