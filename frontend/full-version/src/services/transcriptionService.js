import axios from 'axios';

// Base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Map language names to Azure language codes
const languageCodeMap = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'Latvian': 'lv-LV',
  'German': 'de-DE',
  'French': 'fr-FR',
  'Russian': 'ru-RU',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT'
};

const transcriptionService = {
  // Speech-to-text conversion using your existing backend
  speechToText: async (audioBlob, filename, language) => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    
    // Convert language name to code if needed
    const languageCode = languageCodeMap[language] || language;
    formData.append('language', languageCode);

    console.log(`Sending speech-to-text request for language: ${language} (code: ${languageCode})`);

    try {
      const response = await apiClient.post('/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Speech recognition response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Speech recognition error:', error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : new Error('Network error or server unavailable');
    }
  },
  
  // Translation service using your existing backend
  translateText: async (text, targetLang) => {
    // Convert language name to code if needed
    const targetCode = languageCodeMap[targetLang] || targetLang;
    
    // Extract just the language code without region if it has a hyphen
    const simplifiedTargetCode = targetCode.includes('-') ? targetCode.split('-')[0] : targetCode;
    
    console.log(`translateText: Converting target language '${targetLang}' to code '${targetCode}' (simplified: '${simplifiedTargetCode}')`);
    
    try {
      console.log(`Sending translation request for text: "${text.substring(0, 30)}..." to target language: ${simplifiedTargetCode}`);
      
      const response = await axios.post(`${API_BASE_URL}/translate`, {
        text: text,
        source_language: 'auto', // Auto-detect source language
        target_language: simplifiedTargetCode // Use simplified code (e.g., 'es' instead of 'es-ES')
      });
      
      console.log(`Translation response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Translation error:', error);
      // Log more details about the error
      if (error.response) {
        console.error('Error response data:', error.response.data);
      }
      throw error;
    }
  },
  
  // Text-to-speech conversion using your existing backend
  textToSpeech: async (text, voice) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/text-to-speech`, {
        text,
        voice
      }, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  },
  
  // Get transcript history
  getTranscriptHistory: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transcripts`);
      return response.data;
    } catch (error) {
      console.error('Get transcript history error:', error);
      throw error;
    }
  },
  
  // Store transcript
  storeTranscript: async (originalText, translatedText, sourceLanguage, targetLanguage) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transcripts`, {
        original_text: originalText,
        translated_text: translatedText,
        source_language: sourceLanguage,
        target_language: targetLanguage
      });
      
      return response.data;
    } catch (error) {
      console.error('Store transcript error:', error);
      throw error;
    }
  }
};

export default transcriptionService; 