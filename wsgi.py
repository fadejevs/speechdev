from app import app, socketio
import os

if __name__ == "__main__":
    # Get port from environment variable or use 5000 as default
    port = int(os.environ.get("PORT", 5000))
    # Run the app with socketio
    socketio.run(app, host='0.0.0.0', port=port)
