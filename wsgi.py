from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

import os
import logging # Add logging import
from app import create_app

# --- Add top-level logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.info("--- wsgi.py --- Starting script.")
# --- End top-level logging ---


# Create the app and socketio instances using the factory
# The environment (like PORT) should be available here if loaded early
app, socketio_instance = create_app()
# --- Log object ID after creation ---
logging.info(f"--- wsgi.py --- App created. SocketIO object ID from create_app: {id(socketio_instance)}")

if __name__ == "__main__":
    # This part is mainly for local development testing
    # Gunicorn will run the 'app' object directly in production
    # Use the PORT environment variable if available, otherwise default to 5001 or similar
    port = int(os.environ.get('PORT', 5001))
    # Note: For production on Render, Gunicorn command handles the port binding.
    # Setting debug=False is generally better for anything resembling production.
    logging.info(f"--- wsgi.py --- Running locally via socketio.run on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=False) # Use the instance returned by create_app
