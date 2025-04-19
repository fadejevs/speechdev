import os
import logging
import azure.cognitiveservices.speech as speechsdk

# Set up logger
logger = logging.getLogger(__name__)

class SpeechService:
    """Service for speech recognition using Azure Speech"""
    
    def __init__(self):
        """Initialize the speech service with Azure credentials."""
        self.speech_key = os.environ.get('AZURE_SPEECH_KEY')
        self.speech_region = os.environ.get('AZURE_SPEECH_REGION', 'westeurope')
        
        if not self.speech_key:
            logger.warning("Azure Speech Key not found in environment variables")
        
        # Map of language codes to Azure Speech Service language codes
        # This ensures we use the correct format for each language
        self.language_map = {
            # English variants
            'en': 'en-US',
            'en-us': 'en-US',
            'en-gb': 'en-GB',
            'english': 'en-US',
            
            # Other languages
            'de': 'de-DE',
            'german': 'de-DE',
            
            'fr': 'fr-FR',
            'french': 'fr-FR',
            
            'es': 'es-ES',
            'spanish': 'es-ES',
            
            'it': 'it-IT',
            'italian': 'it-IT',
            
            'ja': 'ja-JP',
            'japanese': 'ja-JP',
            
            'ko': 'ko-KR',
            'korean': 'ko-KR',
            
            'pt': 'pt-BR',
            'portuguese': 'pt-BR',
            'pt-br': 'pt-BR',
            'pt-pt': 'pt-PT',
            
            'ru': 'ru-RU',
            'russian': 'ru-RU',
            
            'zh': 'zh-CN',
            'chinese': 'zh-CN',
            'zh-cn': 'zh-CN',
            
            # Languages that might need special handling
            'lv': 'lv-LV',
            'latvian': 'lv-LV',
            
            'lt': 'lt-LT',
            'lithuanian': 'lt-LT',
            
            'nl': 'nl-NL',
            'dutch': 'nl-NL',
            
            'pl': 'pl-PL',
            'polish': 'pl-PL',
            
            'cs': 'cs-CZ',
            'czech': 'cs-CZ',
            
            'da': 'da-DK',
            'danish': 'da-DK',
            
            'fi': 'fi-FI',
            'finnish': 'fi-FI',
            
            'hu': 'hu-HU',
            'hungarian': 'hu-HU',
            
            'nb': 'nb-NO',
            'norwegian': 'nb-NO',
            
            'sv': 'sv-SE',
            'swedish': 'sv-SE'
        }
        
        # List of languages supported by Azure Speech Service for speech recognition
        # This is used to check if a language is supported before attempting recognition
        self.supported_recognition_languages = [
            'ar-AE', 'ar-BH', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SY',
            'ca-ES', 'cs-CZ', 'da-DK', 'de-DE', 'en-AU', 'en-CA', 'en-GB', 'en-HK', 'en-IE', 'en-IN', 'en-KE',
            'en-NG', 'en-NZ', 'en-PH', 'en-SG', 'en-TZ', 'en-US', 'en-ZA', 'es-AR', 'es-BO', 'es-CL', 'es-CO',
            'es-CR', 'es-CU', 'es-DO', 'es-EC', 'es-ES', 'es-GQ', 'es-GT', 'es-HN', 'es-MX', 'es-NI', 'es-PA',
            'es-PE', 'es-PR', 'es-PY', 'es-SV', 'es-US', 'es-UY', 'es-VE', 'fi-FI', 'fr-BE', 'fr-CA', 'fr-CH',
            'fr-FR', 'ga-IE', 'gu-IN', 'hi-IN', 'it-CH', 'it-IT', 'ja-JP', 'ko-KR', 'mr-IN', 'nb-NO', 'nl-BE',
            'nl-NL', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sv-SE', 'ta-IN', 'te-IN', 'th-TH', 'tr-TR', 'zh-CN',
            'zh-HK', 'zh-TW'
        ]
    
    def _get_speech_language_code(self, language_code):
        """
        Convert language code to the format expected by Azure Speech Service.
        
        Args:
            language_code (str): Language code to convert
            
        Returns:
            str: Converted language code or fallback to en-US if not supported
        """
        if not language_code:
            return 'en-US'  # Default to English
            
        # Normalize to lowercase
        normalized = language_code.lower()
        
        # Check if we have a direct mapping
        if normalized in self.language_map:
            mapped_code = self.language_map[normalized]
            
            # Check if the mapped code is supported for speech recognition
            if mapped_code in self.supported_recognition_languages:
                return mapped_code
            else:
                logger.warning(f"Language {language_code} (mapped to {mapped_code}) is not supported for speech recognition. Falling back to en-US.")
                return 'en-US'
        
        # If no mapping found, check if the original code is supported
        if language_code in self.supported_recognition_languages:
            return language_code
            
        # Log warning and fall back to English
        logger.warning(f"No mapping found for language code: {language_code}, falling back to en-US")
        return 'en-US'
    
    def create_recognizer(self, language):
        """Create a speech recognizer for the given language"""
        if not self.speech_key or not self.speech_region:
            logger.error("Cannot create recognizer: Azure Speech not configured")
            return None
            
        try:
            # Get the correct language code for Azure Speech
            speech_recognition_language = self._get_speech_language_code(language)
            
            # Create speech config
            speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.speech_region)
            speech_config.speech_recognition_language = speech_recognition_language
            
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

    def recognize_speech_from_file(self, audio_file_path, language_code='en-US'):
        """
        Recognize speech from an audio file.
        
        Args:
            audio_file_path (str): Path to the audio file
            language_code (str): Language code for speech recognition
            
        Returns:
            str: Recognized text
        """
        if not self.speech_key:
            logger.error("Azure Speech Key not available")
            return None
            
        # Convert language code to Azure format
        speech_recognition_language = self._get_speech_language_code(language_code)
        
        logger.info(f"SpeechService: Recognizing speech from file: {audio_file_path}, Language: {language_code}")
        logger.info(f"SpeechService: Set speech_recognition_language to: {speech_recognition_language}")
        
        try:
            # Configure speech recognition
            speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.speech_region)
            speech_config.speech_recognition_language = speech_recognition_language
            
            # Create audio configuration
            audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)
            
            # Create speech recognizer
            speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
            
            # Start speech recognition
            logger.info("SpeechService: Starting recognize_once_async()...")
            result = speech_recognizer.recognize_once_async().get()
            
            # Process result
            logger.info(f"SpeechService: Recognition result status: {result.reason}")
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                recognized_text = result.text
                logger.info(f"SpeechService: Recognized: '{recognized_text}' (Language info from SDK: {result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult)})")
                return recognized_text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("SpeechService: No speech could be recognized")
                return None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logger.error(f"SpeechService: Speech Recognition canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logger.error(f"SpeechService: Error details: {cancellation_details.error_details}")
                return None
            else:
                logger.warning(f"SpeechService: Unexpected recognition result: {result.reason}")
                return None
                
        except Exception as e:
            logger.exception(f"Error in recognize_speech_from_file: {str(e)}")
            return None

    def synthesize_speech(self, text, output_file, voice='en-US-JennyNeural'):
        """Text-to-speech conversion"""
        if not self.speech_key or not self.speech_region:
            logger.error("Cannot synthesize speech: Azure Speech not configured.")
            return False
        try:
            logger.debug(f"Synthesizing speech to file: {output_file}, voice: {voice}")
            speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.speech_region)
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
