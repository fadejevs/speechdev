import requests
import os
import logging
import json
import deepl
import azure.cognitiveservices.speech as speechsdk

class TranslationService:
    def __init__(self, config):
        """
        Initializes the translation service, prioritizing DeepL if configured,
        otherwise falling back to Azure.
        Args:
            config (dict): The Flask app's configuration dictionary.
        """
        self.service_type = None
        self.translator = None
        self.speech_config = None

        # Get config values from the passed dictionary using .get() for safety
        azure_key = config.get("AZURE_SPEECH_KEY")
        azure_region = config.get("AZURE_REGION")
        deepl_key = config.get("DEEPL_API_KEY")
        deepl_url = config.get("DEEPL_API_URL") # Will use default from Config class if not in env

        # Log the presence of keys (avoid logging the actual key values)
        logging.info(f"TranslationService init - AZURE_SPEECH_KEY: {'Set' if azure_key else 'Not Set'}")
        logging.info(f"TranslationService init - AZURE_REGION: {azure_region}")
        logging.info(f"TranslationService init - DEEPL_API_KEY: {'Set' if deepl_key else 'Not Set'}")
        logging.info(f"TranslationService init - DEEPL_API_URL: {deepl_url}")

        # --- Initialize DeepL if key is available ---
        if deepl_key:
            try:
                # Fix the DeepL initialization
                self.translator = deepl.Translator(auth_key=deepl_key)
                logger.info(f"Using DeepL for translation with key: {deepl_key[:4]}...")
                self.service_type = "deepl"
            except Exception as e:
                logger.error(f"Failed to initialize DeepL translator: {e}")
                self.translator = None
        else:
            logger.warning("No DeepL API key provided, using mock translations")
            self.translator = None

        # --- Initialize Azure Speech SDK if keys are set AND DeepL wasn't initialized ---
        if azure_key and azure_region and not self.service_type:
            try:
                self.speech_config = speechsdk.SpeechConfig(subscription=azure_key, region=azure_region)
                # Add further Azure config if needed (e.g., target languages for speech translation)
                self.service_type = "azure"
                logging.info("Using Azure Speech SDK for translation/speech services.")
            except Exception as e:
                logging.error(f"Azure Speech SDK initialization failed: {e}")
                self.speech_config = None # Ensure config is None if init fails

        # --- Final Check ---
        if not self.service_type:
            logging.warning("No translation service (DeepL or Azure) could be initialized. Check API keys in environment variables.")
            # Depending on your app's needs, you might want to raise an error here
            # raise RuntimeError("Failed to initialize any translation service.")

        logging.info(f"Finished initializing TranslationService. Service type: {self.service_type}")

    def translate(self, text, target_lang, source_lang=None):
        """Translate text using DeepL API"""
        if not text:
            return ""
        
        logging.info(f"Translating text from {source_lang} to {target_lang} using deepl service")
        
        # If source and target are the same, return the original text
        if source_lang and target_lang and source_lang.lower() == target_lang.lower():
            logging.info(f"Source and target languages are the same ({source_lang}), skipping translation")
            return f"[Translation to {target_lang}] {text}"
        
        try:
            if self.translator:
                logging.info(f"DeepL translation from {source_lang.upper()} to {target_lang.upper()}")
                result = self.translator.translate_text(
                    text,
                    target_lang=target_lang.upper(),
                    source_lang=source_lang.upper() if source_lang else None
                )
                return result.text
            else:
                # Fall back to mock translation if DeepL isn't available
                logging.warning(f"DeepL translator not available, using mock translation")
                return f"[Translation to {target_lang}] {text}"
        except Exception as e:
            logging.error(f"DeepL translation error: {e}")
            # Fall back to mock translation
            logging.warning(f"DeepL translation failed, using mock translation")
            return f"[Translation to {target_lang}] {text}"
    
    def _translate_deepl(self, text, source_language, target_language):
        """Translate using DeepL API"""
        try:
            # Map language codes if needed (DeepL uses different format)
            source_lang = self._map_to_deepl_code(source_language)
            target_lang = self._map_to_deepl_code(target_language)
            
            logging.info(f"DeepL translation from {source_lang} to {target_lang}")
            
            # DeepL API v2 format
            payload = {
                'text': [text],
                'target_lang': target_lang.upper()
            }
            
            # Add source language if not auto
            if source_language.lower() != 'auto':
                payload['source_lang'] = source_lang.upper()
            
            headers = {
                'Authorization': f'DeepL-Auth-Key {self.translator.auth_key}',
                'Content-Type': 'application/json'
            }
            
            logging.info(f"DeepL API URL: {self.translator.server_url}")
            logging.info(f"DeepL headers: {json.dumps(headers)}")
            logging.info(f"DeepL payload: {json.dumps(payload)}")
            
            response = requests.post(self.translator.server_url, headers=headers, json=payload)
            logging.info(f"DeepL response status: {response.status_code}")
            
            if response.status_code != 200:
                logging.error(f"DeepL API error: {response.text}")
                return None
                
            response.raise_for_status()
            
            result = response.json()
            logging.info(f"DeepL response: {json.dumps(result)}")
            
            if 'translations' in result and len(result['translations']) > 0:
                return result['translations'][0]['text']
            else:
                logging.error(f"Unexpected DeepL response format: {json.dumps(result)}")
                return None
                
        except Exception as e:
            logging.error(f"DeepL translation error: {str(e)}")
            return None
    
    def _translate_azure(self, text, source_language, target_language):
        """Translate using Azure Translator API"""
        try:
            path = '/translate'
            constructed_url = "https://api.cognitive.microsofttranslator.com" + path
            
            # Map language codes if needed
            source_lang = source_language.split('-')[0] if '-' in source_language else source_language
            target_lang = target_language.split('-')[0] if '-' in target_language else target_language
            
            params = {
                'api-version': '3.0',
                'from': source_lang,
                'to': target_lang
            }
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.speech_config.subscription,
                'Ocp-Apim-Subscription-Region': self.speech_config.region,
                'Content-type': 'application/json'
            }
            
            body = [{
                'text': text
            }]
            
            response = requests.post(constructed_url, params=params, headers=headers, json=body)
            response.raise_for_status()
            
            result = response.json()
            
            if result and len(result) > 0 and 'translations' in result[0] and len(result[0]['translations']) > 0:
                return result[0]['translations'][0]['text']
            else:
                print(f"Unexpected Azure response format: {result}")
                return None
                
        except Exception as e:
            print(f"Azure translation error: {str(e)}")
            return None
    
    def _map_to_deepl_code(self, language_code):
        """Map language codes to DeepL format"""
        # DeepL uses two-letter codes like EN, DE, FR
        mapping = {
            'en': 'EN', 'en-us': 'EN', 'en-gb': 'EN',
            'de': 'DE', 'de-de': 'DE',
            'fr': 'FR', 'fr-fr': 'FR',
            'es': 'ES', 'es-es': 'ES',
            'it': 'IT', 'it-it': 'IT',
            'nl': 'NL', 'nl-nl': 'NL',
            'pl': 'PL', 'pl-pl': 'PL',
            'pt': 'PT', 'pt-pt': 'PT', 'pt-br': 'PT-BR',
            'ru': 'RU', 'ru-ru': 'RU',
            'ja': 'JA', 'ja-jp': 'JA',
            'zh': 'ZH', 'zh-cn': 'ZH',
            'lv': 'LV', 'lv-lv': 'LV'  # Latvian
        }
        
        # Convert to lowercase for matching
        code = language_code.lower()
        
        # Return mapped code or original if not found
        return mapping.get(code, code[:2].upper())
