import axios from 'axios';

const API_URL = 'http://localhost:5001';

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
  translateText: async (text, targetLang) => {
    const response = await axios.post(`${API_URL}/translate`, {
      text,
      target_lang: targetLang
    });
    return response.data;
  },
  
  // transcript history
  getTranscriptHistory: async () => {
    const response = await axios.get(`${API_URL}/api/transcripts`);
    return response.data;
  }
};

export default speechServices;
