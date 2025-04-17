#!/usr/bin/env bash

# Exit on error
set -o errexit

# Ensure pip dependencies are installed (optional but good practice)
# pip install -r requirements.txt # Render usually does this in the build step, so might be redundant

# Start Gunicorn
# Use the SPECIFIC gevent-websocket worker for Flask-SocketIO compatibility
# Bind to 0.0.0.0 and the PORT environment variable provided by Render
# Point to the 'app' object inside your 'wsgi.py' file
# Ensure app is loaded in the worker (by omitting --preload)
echo "Starting Gunicorn with gevent-websocket worker..."
gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 --bind 0.0.0.0:$PORT wsgi:app