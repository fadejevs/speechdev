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
                # Pass the key directly to the Translator.
                # Check DeepL library docs if you need to specify the server_url explicitly.
                # The free API key implies the free URL.
                self.translator = deepl.Translator(deepl_key)
                # Optional: Test authentication/usage (might incur cost/quota usage)
                # usage = self.translator.get_usage()
                # logging.info(f"DeepL Usage: {usage}")
                self.service_type = "deepl"
                # Log only a few chars of the key for confirmation, not the whole key
                logging.info(f"Using DeepL for translation with key: {deepl_key[:4]}...")
            except deepl.exceptions.AuthorizationException:
                logging.error("DeepL initialization failed: Invalid API Key.")
                self.translator = None
            except Exception as e:
                logging.error(f"DeepL initialization failed: {e}")
                self.translator = None # Ensure translator is None if init fails

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

    def translate(self, text, source_language, target_language):
        """Translate text from source language to target language"""
        logging.info(f"Translating text from {source_language} to {target_language} using {self.service_type} service")
        
        if self.service_type == "deepl" and self.translator:
            result = self._translate_deepl(text, source_language, target_language)
            if result:
                return result
            # Fall back to Azure if DeepL fails
            logging.warning("DeepL translation failed, trying Azure")
            if self.speech_config:
                result = self._translate_azure(text, source_language, target_language)
                if result:
                    return result
        elif self.service_type == "azure":
            result = self._translate_azure(text, source_language, target_language)
            if result:
                return result
        
        # Mock translation for testing or if all else fails
        logging.warning(f"Using mock translation for {source_language} to {target_language}")
        return f"[Translation to {target_language}] {text}"
    
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
