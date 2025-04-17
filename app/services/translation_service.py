import os
import logging
import deepl
import azure.cognitiveservices.speech as speechsdk

# Set up logger
logger = logging.getLogger(__name__)

class TranslationService:
    """Service for translating text using DeepL or Azure"""
    
    def __init__(self, config=None):
        """Initialize the translation service with the given config"""
        config = config or {}
        
        # Get API keys from config or environment
        self.azure_key = config.get('AZURE_SPEECH_KEY') or os.environ.get('AZURE_SPEECH_KEY')
        self.azure_region = config.get('AZURE_REGION') or os.environ.get('AZURE_REGION', 'westeurope')
        self.deepl_key = config.get('DEEPL_API_KEY') or os.environ.get('DEEPL_API_KEY')
        
        # Log configuration (without exposing full keys)
        logger.info(f"TranslationService init - AZURE_SPEECH_KEY: {'Set' if self.azure_key else 'Not set'}")
        logger.info(f"TranslationService init - AZURE_REGION: {self.azure_region}")
        logger.info(f"TranslationService init - DEEPL_API_KEY: {'Set' if self.deepl_key else 'Not set'}")
        
        # Initialize DeepL translator if API key is provided
        self.service_type = 'mock'  # Default to mock
        self.translator = None
        
        if self.deepl_key:
            try:
                self.translator = deepl.Translator(auth_key=self.deepl_key)
                logger.info(f"Using DeepL for translation with key: {self.deepl_key[:4]}...")
                self.service_type = 'deepl'
            except Exception as e:
                logger.error(f"Failed to initialize DeepL translator: {e}")
                self.translator = None
        
        logger.info(f"Finished initializing TranslationService. Service type: {self.service_type}")

    def translate(self, text, target_lang, source_lang=None):
        """Translate text using the configured service"""
        if not text:
            return ""
            
        logger.info(f"Translating text from {source_lang} to {target_lang} using {self.service_type} service")
        
        # If source and target are the same, return the original text
        if source_lang and target_lang and source_lang.lower() == target_lang.lower():
            logger.info(f"Source and target languages are the same ({source_lang}), skipping translation")
            return text
        
        try:
            if self.service_type == 'deepl' and self.translator:
                # Use DeepL for translation
                result = self.translator.translate_text(
                    text,
                    target_lang=target_lang.upper(),
                    source_lang=source_lang.upper() if source_lang else None
                )
                return result.text
            else:
                # Fall back to mock translation
                logger.warning(f"Using mock translation for {source_lang} to {target_lang}")
                return f"[Translation to {target_lang}] {text}"
        except Exception as e:
            logger.error(f"Translation error: {e}")
            # Return a mock translation as fallback
            return f"[Translation error] {text}"
