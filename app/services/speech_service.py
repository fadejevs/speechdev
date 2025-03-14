from azure.cognitiveservices.speech import SpeechConfig, AudioConfig, SpeechRecognizer, SpeechSynthesizer
from app.config import AZURE_SPEECH_KEY, AZURE_REGION

class SpeechService:
    def __init__(self):
        self.speech_config = SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_REGION)
    
    def recognize_speech(self, audio_file):
        """Speech-to-text conversion"""
        try:
            audio_config = AudioConfig(filename=audio_file)
            recognizer = SpeechRecognizer(speech_config=self.speech_config, audio_config=audio_config)
            result = recognizer.recognize_once()
            return result.text if result.reason.name == 'RecognizedSpeech' else None
        except Exception as e:
            print(f"Recognition error: {str(e)}")
            return None

    def synthesize_speech(self, text, output_file, voice='en-US-JennyNeural'):
        """Text-to-speech conversion"""
        try:
            self.speech_config.speech_synthesis_voice_name = voice
            audio_config = AudioConfig(filename=output_file)
            synthesizer = SpeechSynthesizer(speech_config=self.speech_config, audio_config=audio_config)
            result = synthesizer.speak_text_async(text).get()
            return result.reason.name == 'SynthesizingAudioCompleted'
        except Exception as e:
            print(f"Synthesis error: {str(e)}")
            return False
