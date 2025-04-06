from flask import Blueprint, render_template, jsonify, current_app
from app.services.firebase_service import FirebaseService

# Create a Blueprint
main_bp = Blueprint('main', __name__)

firebase_service = FirebaseService()

@main_bp.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        current_app.logger.error(f"Error rendering index.html: {e}")
        return "Flask server running. Template 'index.html' not found or error rendering.", 500

@main_bp.route('/api/transcripts', methods=['GET'])
def get_transcripts():
    try:
        transcripts = firebase_service.get_transcripts(limit=20)
        return jsonify(transcripts), 200
    except Exception as e:
        current_app.logger.error(f"Error getting transcripts: {e}")
        return jsonify({'error': str(e)}), 500 