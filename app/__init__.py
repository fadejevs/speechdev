from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret123'
CORS(app) 
socketio = SocketIO(app, cors_allowed_origins="*")

from app.routes import speech, translation, tts, websocket, main 