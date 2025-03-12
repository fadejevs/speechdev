from app import socketio
import time
from flask_socketio import emit

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connection_response', {'data': 'Connected!'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('test_delay')
def handle_test_delay(data):
    print('Starting delay test...')
    emit('delay_update', {'message': 'Starting 5 second delay test...'})
    
    # 5 sec delay
    time.sleep(5)
    
    # Completed
    emit('delay_update', {'message': 'Delay test completed!'})

@socketio.on('message')
def handle_message(data):
    print('Received message:', data) 