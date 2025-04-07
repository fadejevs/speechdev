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
      const response = await axios.post(`${API_URL}/translate`, {
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Translation failed');
    }
  },
  
  // transcript history
  getTranscriptHistory: async () => {
    const response = await axios.get(`${API_URL}/api/transcripts`);
    return response.data;
  }
};

export default speechServices;
