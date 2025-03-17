from datetime import datetime
from app.firebase_config import db

class FirebaseService:
    def __init__(self):
        self.db = db
    
    def store_transcript(self, text, transcript_type, source_lang='en', translated_text=None, target_lang=None):
        """Store speech/translation transcript"""
        transcript_ref = self.db.collection('transcripts').document()
        transcript_data = {
            'original_text': text,
            'source_language': source_lang,
            'target_language': target_lang,
            'translated_text': translated_text,
            'timestamp': datetime.now(),
            'type': transcript_type
        }
        transcript_ref.set(transcript_data)
        return transcript_ref.id

    def get_transcripts(self, limit=10):
        """Get recent transcripts"""
        transcripts = (self.db.collection('transcripts')
                      .order_by('timestamp', direction='DESCENDING')
                      .limit(limit)
                      .stream())
        return [doc.to_dict() for doc in transcripts] 