import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("Connected!")

@sio.event
def disconnect():
    print("Disconnected!")

@sio.on('connection_response')
def on_message(data):
    print("Server says:", data)

try:
    sio.connect('http://localhost:5001')
    time.sleep(5)  # Keep connection open for 5 seconds
finally:
    sio.disconnect() 