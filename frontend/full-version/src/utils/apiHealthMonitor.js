// API Health Monitor - Tracks real API usage and health status
class ApiHealthMonitor {
  constructor() {
    this.healthData = this.loadHealthData();
  }

  // Load health data from localStorage
  loadHealthData() {
    try {
      const stored = localStorage.getItem('everspeak_api_health');
      return stored ? JSON.parse(stored) : this.getDefaultHealthData();
    } catch {
      return this.getDefaultHealthData();
    }
  }

  // Save health data to localStorage
  saveHealthData() {
    try {
      localStorage.setItem('everspeak_api_health', JSON.stringify(this.healthData));
    } catch (error) {
      console.warn('Could not save API health data:', error);
    }
  }

  // Default health data structure
  getDefaultHealthData() {
    return {
      deepl_translation: {
        lastCall: null,
        lastSuccess: null,
        lastError: null,
        consecutiveErrors: 0,
        totalCalls: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      openai_tts: {
        lastCall: null,
        lastSuccess: null,
        lastError: null,
        consecutiveErrors: 0,
        totalCalls: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      openai_chat: {
        lastCall: null,
        lastSuccess: null,
        lastError: null,
        consecutiveErrors: 0,
        totalCalls: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      supabase: {
        lastCall: null,
        lastSuccess: null,
        lastError: null,
        consecutiveErrors: 0,
        totalCalls: 0,
        errorCount: 0,
        avgResponseTime: 0
      }
    };
  }

  // Record a successful API call
  recordSuccess(apiName, responseTime = 0) {
    const now = Date.now();
    const api = this.healthData[apiName];
    
    if (api) {
      api.lastCall = now;
      api.lastSuccess = now;
      api.consecutiveErrors = 0;
      api.totalCalls += 1;
      
      // Update average response time
      if (responseTime > 0) {
        api.avgResponseTime = api.avgResponseTime 
          ? (api.avgResponseTime + responseTime) / 2 
          : responseTime;
      }
      
      this.saveHealthData();
    }
  }

  // Record a failed API call
  recordError(apiName, error) {
    const now = Date.now();
    const api = this.healthData[apiName];
    
    if (api) {
      api.lastCall = now;
      api.lastError = now;
      api.consecutiveErrors += 1;
      api.totalCalls += 1;
      api.errorCount += 1;
      
      this.saveHealthData();
    }
  }

  // Get health status for a specific API
  getApiHealth(apiName) {
    const api = this.healthData[apiName];
    if (!api || !api.lastCall) {
      return {
        status: 'unknown',
        uptime: 0,
        response_time: 'N/A',
        last_incident: 'No data',
        usage_today: 'Unknown'
      };
    }

    const now = Date.now();
    const hoursSinceLastCall = (now - api.lastCall) / (1000 * 60 * 60);
    const hoursSinceLastError = api.lastError ? (now - api.lastError) / (1000 * 60 * 60) : 999;
    
    // Determine status
    let status = 'online';
    let last_incident = 'None';
    
    if (api.consecutiveErrors >= 3) {
      status = 'offline';
      last_incident = 'Multiple errors';
    } else if (api.consecutiveErrors > 0 && hoursSinceLastError < 1) {
      status = 'degraded';
      last_incident = 'Recent error';
    } else if (hoursSinceLastCall > 24) {
      status = 'unknown';
      last_incident = 'No recent activity';
    }

    // Calculate uptime percentage
    const uptime = api.totalCalls > 0 
      ? ((api.totalCalls - api.errorCount) / api.totalCalls) * 100 
      : 0;

    return {
      status,
      uptime: Math.max(uptime, 0),
      response_time: api.avgResponseTime > 0 ? `${Math.round(api.avgResponseTime)}ms` : 'N/A',
      last_incident,
      usage_today: api.totalCalls,
      last_call: api.lastCall,
      consecutive_errors: api.consecutiveErrors
    };
  }

  // Get all API health data
  getAllApiHealth() {
    return {
      'DeepL Translation API': {
        ...this.getApiHealth('deepl_translation'),
        cost_per_hour: '$2.40'
      },
      'OpenAI API (TTS + LLM)': {
        ...this.getApiHealth('openai_tts'),
        cost_per_hour: '$4.20'
      },
      'OpenAI Chat API': {
        ...this.getApiHealth('openai_chat'),
        cost_per_hour: '$3.50'
      },
      'Supabase Database': {
        ...this.getApiHealth('supabase'),
        cost_per_hour: '$0.25'
      }
    };
  }

  // Clear old data (optional - call this periodically)
  clearOldData(daysToKeep = 7) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    Object.keys(this.healthData).forEach(apiName => {
      const api = this.healthData[apiName];
      if (api.lastCall && api.lastCall < cutoff) {
        // Reset counters but keep structure
        api.totalCalls = 0;
        api.errorCount = 0;
        api.consecutiveErrors = 0;
      }
    });
    
    this.saveHealthData();
  }
}

// Create singleton instance
const apiHealthMonitor = new ApiHealthMonitor();

export default apiHealthMonitor; 