import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print('Connected to server')

@sio.event
def disconnect():
    print('Disconnected from server')

@sio.on('connection_response')
def on_connection_response(data):
    print('Server response:', data)

@sio.on('delay_update')
def on_delay_update(data):
    print('Received update:', data['message'])

try:
    sio.connect('http://localhost:5001')
    
    print('Sending delay test event...')
    sio.emit('test_delay', {'test': 'data'})
    
    time.sleep(10)
    
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    # Disconnect
    if sio.connected:
        sio.disconnect() 