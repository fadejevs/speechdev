import os
import logging
import azure.cognitiveservices.speech as speechsdk
import uuid

logger = logging.getLogger(__name__)

class TTSService:
    """Service for text-to-speech conversion."""
    
    def __init__(self):
        """Initialize the TTS service with Azure credentials."""
        self.speech_key = os.environ.get('AZURE_SPEECH_KEY')
        self.speech_region = os.environ.get('AZURE_SPEECH_REGION', 'westeurope')
        
        if not self.speech_key:
            logger.warning("Azure Speech Key not found in environment variables")
        
        # Map of language codes to voice names
        # This can be expanded with more voices as needed
        self.voice_map = {
            'en': 'en-US-JennyNeural',
            'en-us': 'en-US-JennyNeural',
            'en-gb': 'en-GB-SoniaNeural',
            'fr': 'fr-FR-DeniseNeural',
            'es': 'es-ES-ElviraNeural',
            'de': 'de-DE-KatjaNeural',
            'it': 'it-IT-ElsaNeural',
            'ja': 'ja-JP-NanamiNeural',
            'ko': 'ko-KR-SunHiNeural',
            'pt': 'pt-PT-RaquelNeural',
            'ru': 'ru-RU-SvetlanaNeural',
            'zh': 'zh-CN-XiaoxiaoNeural',
            'nl': 'nl-NL-ColetteNeural',
            'pl': 'pl-PL-AgnieszkaNeural',
            'lv': 'lv-LV-EveritaNeural',
            'lt': 'lt-LT-OnaNeural',
            'bg': 'bg-BG-KalinaNeural',
            'cs': 'cs-CZ-VlastaNeural',
            'da': 'da-DK-ChristelNeural',
            'el': 'el-GR-AthinaNeural',
            'et': 'et-EE-AnuNeural',
            'fi': 'fi-FI-NooraNeural',
            'hu': 'hu-HU-NoemiNeural',
            'id': 'id-ID-GadisNeural',
            'nb': 'nb-NO-IselinNeural',
            'ro': 'ro-RO-AlinaNeural',
            'sk': 'sk-SK-ViktoriaNeural',
            'sl': 'sl-SI-PetraNeural',
            'sv': 'sv-SE-SofieNeural',
            'tr': 'tr-TR-EmelNeural',
            'uk': 'uk-UA-PolinaNeural'
        }
    
    def _get_voice_name(self, language_code):
        """Get the appropriate voice name for a language code."""
        if not language_code:
            return 'en-US-JennyNeural'  # Default voice
        
        # Normalize to lowercase
        normalized = language_code.lower()
        
        # Check if we have a direct mapping
        if normalized in self.voice_map:
            return self.voice_map[normalized]
        
        # Try just the language part (before the hyphen)
        if '-' in normalized:
            lang_part = normalized.split('-')[0]
            if lang_part in self.voice_map:
                return self.voice_map[lang_part]
        
        # If no mapping found, use default
        logger.warning(f"No voice mapping found for language code: {language_code}, using default")
        return 'en-US-JennyNeural'
    
    def text_to_speech(self, text, language_code, output_dir="temp_audio"):
        """
        Convert text to speech and save as audio file.
        
        Args:
            text (str): Text to convert to speech
            language_code (str): Language code for the voice
            output_dir (str): Directory to save the audio file
            
        Returns:
            str: Path to the generated audio file
        """
        if not text:
            logger.warning("Empty text provided for TTS")
            return None
        
        if not self.speech_key:
            logger.error("Azure Speech Key not available")
            return None
        
        try:
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Generate a unique filename
            filename = f"tts_{uuid.uuid4().hex}.wav"
            output_path = os.path.join(output_dir, filename)
            
            # Get the appropriate voice name
            voice_name = self._get_voice_name(language_code)
            
            # Configure speech config
            speech_config = speechsdk.SpeechConfig(
                subscription=self.speech_key, 
                region=self.speech_region
            )
            
            # Set the voice
            speech_config.speech_synthesis_voice_name = voice_name
            
            # Configure audio output
            audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
            
            # Create speech synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=speech_config, 
                audio_config=audio_config
            )
            
            logger.info(f"Starting TTS for language: {language_code} using voice: {voice_name}")
            
            # Synthesize speech
            result = synthesizer.speak_text_async(text).get()
            
            # Check result
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info(f"TTS completed successfully, saved to: {output_path}")
                
                # Verify file exists and has content
                if os.path.exists(output_path):
                    file_size = os.path.getsize(output_path)
                    logger.info(f"TTS file created: {output_path}, size: {file_size} bytes")
                    
                    # Ensure file has proper permissions
                    os.chmod(output_path, 0o644)  # Read/write for owner, read for others
                    logger.info(f"Set permissions on TTS file: {output_path}")
                    
                    return output_path
                else:
                    logger.error(f"TTS file not found after synthesis: {output_path}")
                    return None
            else:
                logger.error(f"TTS failed: {result.reason}")
                return None
                
        except Exception as e:
            logger.exception(f"Error in text_to_speech: {str(e)}")
            return None
