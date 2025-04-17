#!/usr/bin/env bash

# Exit on error
set -o errexit

# Ensure pip dependencies are installed (optional but good practice)
# pip install -r requirements.txt # Render usually does this in the build step, so might be redundant

# Start Gunicorn
# Use the gevent worker for Flask-SocketIO
# Bind to 0.0.0.0 and the PORT environment variable provided by Render
# Point to the 'app' object inside your 'wsgi.py' file
echo "Starting Gunicorn..."
gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:$PORT wsgi:app