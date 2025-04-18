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

    def _simplify_lang_code(self, lang_code):
        """Extracts the base 2-letter language code (e.g., 'en' from 'en-US')."""
        if lang_code and isinstance(lang_code, str):
            return lang_code.split('-')[0].upper() # Take first part and uppercase
        return None # Return None if input is invalid

    def translate(self, text, target_lang, source_lang=None):
        """Translate text using the configured service"""
        if not text:
            return ""
            
        # Simplify codes *before* logging and comparison
        simple_source_lang = self._simplify_lang_code(source_lang)
        simple_target_lang = self._simplify_lang_code(target_lang) # Simplify target too for consistency

        # Log with original and simplified codes for clarity
        logger.info(f"Translating text from {source_lang} ({simple_source_lang}) to {target_lang} ({simple_target_lang}) using {self.service_type} service")
        
        # If source and target are the same (using simplified codes for comparison)
        if simple_source_lang and simple_target_lang and simple_source_lang == simple_target_lang:
            logger.info(f"Source and target languages simplify to the same code ({simple_source_lang}), skipping translation")
            return text
        
        try:
            if self.service_type == 'deepl' and self.translator:
                # Use DeepL for translation with simplified codes
                logger.debug(f"Calling DeepL: text='{text[:50]}...', target_lang='{simple_target_lang}', source_lang='{simple_source_lang}'")
                result = self.translator.translate_text(
                    text,
                    target_lang=simple_target_lang, # Use simplified target
                    source_lang=simple_source_lang  # Use simplified source
                )
                # Check if result is valid before accessing .text
                if result and hasattr(result, 'text'):
                    logger.info(f"DeepL translation successful. Detected source: {result.detected_source_lang}")
                    return result.text
                else:
                    logger.error("DeepL translation returned an unexpected result structure.")
                    return f"[Translation error: Invalid DeepL response]"
            else:
                # Fall back to mock translation
                logger.warning(f"Using mock translation for {source_lang} to {target_lang}")
                return f"[Translation to {target_lang}] {text}"
        except deepl.exceptions.DeepLException as e:
            # Catch specific DeepL errors for better logging
            logger.error(f"DeepL API error: {e}", exc_info=True)
            return f"[Translation error: {e}]"
        except Exception as e:
            logger.error(f"Generic translation error: {e}", exc_info=True)
            # Return a mock translation as fallback
            return f"[Translation error] {text}"
