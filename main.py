from app import app, socketio
from flask import render_template

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000) 


@app.route('/')
def index():
    return render_template('index.html')