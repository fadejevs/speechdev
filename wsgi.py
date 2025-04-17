from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

import os
import logging # Keep logging import
from app import create_app

# Use root logger here before app logger is configured
logging.info("--- wsgi.py --- Starting script.")


# Create the app and socketio instances using the factory
# Gunicorn needs 'app', but we also need the 'socketio' instance from create_app
# for potential future use or clarity, though Gunicorn won't use it directly.
app, socketio = create_app() # Assign to socketio directly
# Use root logger here before app logger is configured
logging.info(f"--- wsgi.py --- App created. SocketIO object ID from create_app: {id(socketio)}")

# Gunicorn runs 'app' directly, so the __main__ block is not needed for production.
