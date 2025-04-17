from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

import os
import logging # Keep logging import
from app import create_app

# --- Remove basicConfig ---
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.info("--- wsgi.py --- Starting script.") # Keep this log


# Create the app and socketio instances using the factory
# Gunicorn needs 'app', but we also need the 'socketio' instance from create_app
# for potential future use or clarity, though Gunicorn won't use it directly.
app, socketio = create_app() # Assign to socketio directly
logging.info(f"--- wsgi.py --- App created. SocketIO object ID from create_app: {id(socketio)}")

# Gunicorn runs 'app' directly, so the __main__ block is not needed for production.
