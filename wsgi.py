from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

import os
import sys
import logging

# Add the project root directory to the Python path
# This helps ensure that imports work correctly, especially when run via Gunicorn
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import app and socketio directly from the app package
# They are created at the module level in app/__init__.py
from app import app, socketio

# Get the logger configured in app/__init__.py
logger = logging.getLogger(__name__)
logger.info("--- wsgi.py --- Starting script.")

if __name__ == "__main__":
    logger.info("--- wsgi.py --- Running SocketIO development server.")
    # Use socketio.run for development, Gunicorn handles production
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)
else:
    # When run by Gunicorn, it just needs the 'app' callable.
    # Gunicorn will use the command line arguments to bind host/port.
    logger.info("--- wsgi.py --- Script loaded by WSGI server (like Gunicorn). 'app' object is ready.")
    # Gunicorn will look for the 'app' variable in this file.
    pass # No need to call run here
