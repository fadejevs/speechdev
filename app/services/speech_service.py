import os
import logging
import azure.cognitiveservices.speech as speechsdk

# Set up logger
logger = logging.getLogger(__name__)

class SpeechService:
    """Service for speech recognition using Azure Speech"""
    
    def __init__(self, config=None):
        """Initialize the speech service with the given config"""
        config = config or {}
        
        # Get API keys from config or environment
        self.azure_key = config.get('AZURE_SPEECH_KEY') or os.environ.get('AZURE_SPEECH_KEY')
        self.azure_region = config.get('AZURE_REGION') or os.environ.get('AZURE_REGION', 'westeurope')
        
        # Log configuration (without exposing full keys)
        logger.info(f"SpeechService init - AZURE_SPEECH_KEY: {'Set' if self.azure_key else 'Not set'}")
        logger.info(f"SpeechService init - AZURE_REGION: {self.azure_region}")
        
        # Check if Azure Speech is configured
        if not self.azure_key or not self.azure_region:
            logger.warning("Azure Speech not fully configured")
    
    def create_recognizer(self, language):
        """Create a speech recognizer for the given language"""
        if not self.azure_key or not self.azure_region:
            logger.error("Cannot create recognizer: Azure Speech not configured")
            return None
            
        try:
            # Create speech config
            speech_config = speechsdk.SpeechConfig(subscription=self.azure_key, region=self.azure_region)
            speech_config.speech_recognition_language = language
            
            # Create audio stream
            audio_stream = speechsdk.audio.PushAudioInputStream()
            audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)
            
            # Create recognizer
            recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
            
            return {
                'recognizer': recognizer,
                'audio_stream': audio_stream
            }
        except Exception as e:
            logger.error(f"Failed to create recognizer: {e}")
            return None

    def recognize_speech(self, audio_file, language='en-US'):
        """Speech-to-text conversion for a given audio file and language."""
        if not self.azure_key or not self.azure_region:
            logger.error("Cannot recognize speech: Azure Speech not configured.")
            return None
        try:
            logger.debug(f"Recognizing speech from file: {audio_file} for language: {language}")

            # Create speech config *with the specified language*
            speech_config = speechsdk.SpeechConfig(subscription=self.azure_key, region=self.azure_region)
            speech_config.speech_recognition_language = language

            # Create audio config from file
            audio_config = speechsdk.AudioConfig(filename=audio_file)

            # Create recognizer with the updated configs
            recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

            # Perform recognition
            result = recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logger.info(f"Speech recognized ({language}): {result.text}")
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning(f"No speech could be recognized ({language}).")
                return None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logger.error(f"Speech Recognition canceled ({language}): {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logger.error(f"Error details: {cancellation_details.error_details}")
                return None
            return None
        except Exception as e:
            logger.error(f"Recognition error ({language}): {str(e)}")
            return None

    def synthesize_speech(self, text, output_file, voice='en-US-JennyNeural'):
        """Text-to-speech conversion"""
        if not self.azure_key or not self.azure_region:
            logger.error("Cannot synthesize speech: Azure Speech not configured.")
            return False
        try:
            logger.debug(f"Synthesizing speech to file: {output_file}, voice: {voice}")
            speech_config = speechsdk.SpeechConfig(subscription=self.azure_key, region=self.azure_region)
            speech_config.speech_synthesis_voice_name = voice
            audio_config = speechsdk.AudioConfig(filename=output_file) if output_file else None
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
            result = synthesizer.speak_text_async(text).get()

            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info(f"Speech synthesis successful for: '{text[:50]}...'")
                return True
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logger.error(f"Speech synthesis canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logger.error(f"Error details: {cancellation_details.error_details}")
                return False
            return False
        except Exception as e:
            logger.error(f"Synthesis error: {str(e)}")
            return False
