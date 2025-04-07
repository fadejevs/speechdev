import requests
import os
from app.config import AZURE_SPEECH_KEY, AZURE_REGION, DEEPL_API_KEY, DEEPL_API_URL

class TranslationService:
    def __init__(self):
        # Check which translation service to use based on available keys
        if DEEPL_API_KEY and DEEPL_API_URL:
            self.service = "deepl"
            self.key = DEEPL_API_KEY
            self.url = DEEPL_API_URL
            print("Using DeepL for translation")
        elif AZURE_SPEECH_KEY and AZURE_REGION:
            self.service = "azure"
            self.key = AZURE_SPEECH_KEY
            self.region = AZURE_REGION
            self.endpoint = "https://api.cognitive.microsofttranslator.com"
            print("Using Azure for translation")
        else:
            self.service = "mock"
            print("No translation keys found, using mock translations")
        
    def translate(self, text, source_language, target_language):
        """Translate text from source language to target language"""
        if self.service == "deepl":
            return self._translate_deepl(text, source_language, target_language)
        elif self.service == "azure":
            return self._translate_azure(text, source_language, target_language)
        else:
            # Mock translation for testing
            return f"[MOCK TRANSLATION to {target_language}] {text}"
    
    def _translate_deepl(self, text, source_language, target_language):
        """Translate using DeepL API"""
        try:
            # Map language codes if needed (DeepL uses different format)
            source_lang = self._map_to_deepl_code(source_language)
            target_lang = self._map_to_deepl_code(target_language)
            
            payload = {
                'text': text,
                'source_lang': source_lang.upper(),
                'target_lang': target_lang.upper(),
                'auth_key': self.key
            }
            
            response = requests.post(self.url, data=payload)
            response.raise_for_status()
            
            result = response.json()
            
            if 'translations' in result and len(result['translations']) > 0:
                return result['translations'][0]['text']
            else:
                print(f"Unexpected DeepL response format: {result}")
                return None
                
        except Exception as e:
            print(f"DeepL translation error: {str(e)}")
            return None
    
    def _translate_azure(self, text, source_language, target_language):
        """Translate using Azure Translator API"""
        try:
            path = '/translate'
            constructed_url = self.endpoint + path
            
            # Map language codes if needed
            source_lang = source_language.split('-')[0] if '-' in source_language else source_language
            target_lang = target_language.split('-')[0] if '-' in target_language else target_language
            
            params = {
                'api-version': '3.0',
                'from': source_lang,
                'to': target_lang
            }
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.key,
                'Ocp-Apim-Subscription-Region': self.region,
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
