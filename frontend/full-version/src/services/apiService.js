import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

const apiService = {
  // Speech-to-text conversion
  recognizeSpeech: async (audioBlob, sourceLanguage) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('source_language', sourceLanguage);
      
      const response = await axios.post(`${API_BASE_URL}/api/speech/recognize`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Speech recognition error:', error);
      throw error;
    }
  },
  
  // Translation service
  translateText: async (text, sourceLanguage, targetLanguage) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/translate`, {
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  },
  
  // Text-to-speech conversion
  synthesizeSpeech: async (text, language) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/speech/synthesize`, {
        text,
        language
      }, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  },
  
  // Store transcript in Firebase
  storeTranscript: async (originalText, translatedText, sourceLanguage, targetLanguage, transcriptType) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transcripts`, {
        original_text: originalText,
        translated_text: translatedText,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        type: transcriptType
      });
      
      return response.data;
    } catch (error) {
      console.error('Store transcript error:', error);
      throw error;
    }
  },
  
  // Get transcripts from Firebase
  getTranscripts: async (limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transcripts?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get transcripts error:', error);
      throw error;
    }
  }
};

export default apiService; 