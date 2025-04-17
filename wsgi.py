from gevent import monkey
monkey.patch_all() # Important for gevent! Place this at the very top.

import os
from app import create_app

# Create the app and socketio instances using the factory
# The environment (like PORT) should be available here if loaded early
app, socketio = create_app()

if __name__ == "__main__":
    # This part is mainly for local development testing
    # Gunicorn will run the 'app' object directly in production
    # Use the PORT environment variable if available, otherwise default to 5001 or similar
    port = int(os.environ.get('PORT', 5001))
    # Note: For production on Render, Gunicorn command handles the port binding.
    # Setting debug=False is generally better for anything resembling production.
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
