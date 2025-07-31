// Monitored Fetch - Wraps fetch to automatically track API health
import apiHealthMonitor from './apiHealthMonitor';

// Map API endpoints to monitor names
const API_MONITOR_MAP = {
  '/api/translate': 'deepl_translation',
  '/api/openai-tts': 'openai_tts',
  '/api/openai-chat': 'openai_chat'
};

// Enhanced fetch that automatically monitors API health
export const monitoredFetch = async (url, options = {}) => {
  const startTime = Date.now();
  
  // Determine which API we're monitoring
  const monitorName = API_MONITOR_MAP[url] || getMonitorNameFromUrl(url);
  
  try {
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    if (monitorName) {
      if (response.ok) {
        apiHealthMonitor.recordSuccess(monitorName, responseTime);
      } else {
        apiHealthMonitor.recordError(monitorName, `HTTP ${response.status}`);
      }
    }
    
    return response;
  } catch (error) {
    if (monitorName) {
      apiHealthMonitor.recordError(monitorName, error.message);
    }
    throw error;
  }
};

// Helper to determine monitor name from URL
function getMonitorNameFromUrl(url) {
  if (typeof url === 'string') {
    if (url.includes('supabase')) return 'supabase';
    if (url.includes('deepl') || url.includes('translate')) return 'deepl_translation';
    if (url.includes('openai') || url.includes('tts')) return 'openai_tts';
    if (url.includes('openai') || url.includes('chat')) return 'openai_chat';
  }
  return null;
}

// Create a monitored version of common API functions
export const monitoredApiCall = {
  // Monitored translation
  async translate(text, targetLang) {
    return monitoredFetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_lang: targetLang })
    });
  },

  // Monitored TTS
  async textToSpeech(text, voice = 'alloy', speed = 1.0) {
    return monitoredFetch('/api/openai-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed })
    });
  },

  // Monitored chat
  async openaiChat(payload) {
    const response = await monitoredFetch('/api/openai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response;
  },

  // Monitored Supabase call
  async supabase(table, query = '', method = 'GET', body = null) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!baseUrl || !apiKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const url = `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
    
    const options = {
      method,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
      options.headers['Prefer'] = 'return=representation';
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        apiHealthMonitor.recordSuccess('supabase', responseTime);
        const data = await response.json();
        return { data, response };
      } else {
        const errorText = await response.text();
        apiHealthMonitor.recordError('supabase', `HTTP ${response.status}: ${errorText}`);
        throw new Error(`Supabase error: ${response.status} ${errorText}`);
      }
    } catch (error) {
      apiHealthMonitor.recordError('supabase', error.message);
      throw error;
    }
  }
};

export default monitoredFetch; 