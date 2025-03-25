from flask import render_template, jsonify
from app import app
from app.services.firebase_service import FirebaseService

firebase_service = FirebaseService()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transcripts', methods=['GET'])
def get_transcripts():
    try:
        transcripts = firebase_service.get_transcripts(limit=20)
        return jsonify(transcripts), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 