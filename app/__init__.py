from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret123'
CORS(app) 
socketio = SocketIO(app, cors_allowed_origins="*")

from app.routes import speech, translation, tts, websocket, main 

if __name__ == '__main__':
    # Make sure debug=True is only used for development
    app.run(host='0.0.0.0', port=5000, debug=True) 