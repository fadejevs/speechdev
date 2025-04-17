from azure.cognitiveservices.speech import SpeechConfig, AudioConfig, SpeechRecognizer, SpeechSynthesizer
import logging

class SpeechService:
    def __init__(self, config):
        azure_key = config.get("AZURE_SPEECH_KEY")
        azure_region = config.get("AZURE_REGION")

        if not azure_key or not azure_region:
            logging.error("Azure Speech Key or Region not configured properly!")
            self.speech_config = None
        else:
            self.speech_config = SpeechConfig(subscription=azure_key, region=azure_region)
            logging.info("SpeechService initialized with Azure config.")
    
    def recognize_speech(self, audio_file):
        """Speech-to-text conversion"""
        if not self.speech_config:
            logging.error("Cannot recognize speech: SpeechService not configured.")
            return None
        try:
            logging.debug(f"Recognizing speech from file: {audio_file}")
            audio_config = AudioConfig(filename=audio_file)
            recognizer = SpeechRecognizer(speech_config=self.speech_config, audio_config=audio_config)
            result = recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logging.info(f"Speech recognized: {result.text}")
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logging.warning("No speech could be recognized.")
                return None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logging.error(f"Speech Recognition canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logging.error(f"Error details: {cancellation_details.error_details}")
                return None
            return None
        except Exception as e:
            logging.error(f"Recognition error: {str(e)}")
            return None

    def synthesize_speech(self, text, output_file, voice='en-US-JennyNeural'):
        """Text-to-speech conversion"""
        if not self.speech_config:
            logging.error("Cannot synthesize speech: SpeechService not configured.")
            return False
        try:
            logging.debug(f"Synthesizing speech to file: {output_file}, voice: {voice}")
            self.speech_config.speech_synthesis_voice_name = voice
            audio_config = AudioConfig(filename=output_file) if output_file else None
            synthesizer = SpeechSynthesizer(speech_config=self.speech_config, audio_config=audio_config)
            result = synthesizer.speak_text_async(text).get()

            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logging.info(f"Speech synthesis successful for: '{text[:50]}...'")
                return True
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logging.error(f"Speech synthesis canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logging.error(f"Error details: {cancellation_details.error_details}")
                return False
            return False
        except Exception as e:
            logging.error(f"Synthesis error: {str(e)}")
            return False
