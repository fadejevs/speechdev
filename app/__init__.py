from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret123'
socketio = SocketIO(app, cors_allowed_origins="*")

from app.routes import speech, translation, tts, websocket 