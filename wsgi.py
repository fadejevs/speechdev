from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

from app import app, socketio # Import the created app and socketio instances

if __name__ == "__main__":
    # Use socketio.run for development server
    # For production (like Render with Gunicorn), Gunicorn handles running the app.
    # The 'app' object passed to Gunicorn is the Flask app.
    # Gunicorn needs the 'worker_class = geventwebsocket.gunicorn.workers.GeventWebSocketWorker'
    # and the correct command like:
    # gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker --bind 0.0.0.0:$PORT wsgi:app
    #
    # You might run locally with:
    # socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    pass # Gunicorn runs 'app' from this file in production
