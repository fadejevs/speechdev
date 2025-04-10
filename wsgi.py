import os
from app import app, socketio

if __name__ == "__main__":
    # Get port from environment variable or use 5000 as default
    port = int(os.environ.get("PORT", 5000))
    # Use socketio.run without the problematic parameters
    socketio.run(app, host='0.0.0.0', port=port)
