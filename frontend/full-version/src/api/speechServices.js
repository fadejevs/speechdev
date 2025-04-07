import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';

const speechServices = {
  // Speech to text
  convertSpeechToText: async (audioFile) => {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    const response = await axios.post(`${API_URL}/speech-to-text`, formData);
    return response.data;
  },
  
  // Text to speech
  convertTextToSpeech: async (text, voice) => {
    const response = await axios.post(
      `${API_URL}/text-to-speech`, 
      { text, voice },
      { responseType: 'blob' }
    );
    return response.data;
  },
  
  // Translation
  translateText: async (text, sourceLanguage, targetLanguage) => {
    try {
      console.log(`Translating from ${sourceLanguage} to ${targetLanguage}: "${text}"`);
      
      const response = await axios.post(`${API_URL}/translate`, {
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      });
      
      console.log('Translation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Translation error:', error);
      // Return a fallback translation object instead of throwing
      return {
        translated_text: `[Translation to ${targetLanguage} failed: ${error.message}]`,
        source_language: sourceLanguage,
        target_language: targetLanguage
      };
    }
  },
  
  // transcript history
  getTranscriptHistory: async () => {
    const response = await axios.get(`${API_URL}/api/transcripts`);
    return response.data;
  }
};

export default speechServices;
