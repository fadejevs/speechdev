import requests
import os
from app.config import AZURE_TRANSLATOR_KEY, AZURE_REGION

class TranslationService:
    def __init__(self):
        self.key = AZURE_TRANSLATOR_KEY
        self.region = AZURE_REGION
        self.endpoint = "https://api.cognitive.microsofttranslator.com"
        
    def translate(self, text, source_language, target_language):
        """Translate text from source language to target language"""
        try:
            path = '/translate'
            constructed_url = self.endpoint + path
            
            params = {
                'api-version': '3.0',
                'from': source_language,
                'to': target_language
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
                return None
                
        except Exception as e:
            print(f"Translation error: {str(e)}")
            return None
