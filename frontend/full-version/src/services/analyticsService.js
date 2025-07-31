// Analytics API Service for Everspeak - Real External Services Monitoring
class AnalyticsService {
  
  // Get real operational metrics from your live services
  async fetchOverviewMetrics() {
    try {
      // Get real data from Supabase (events/transcripts)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      let totalTranscripts = 0;
      let transcriptsToday = 0;
      let activeSessions = 0;
      
      if (supabaseUrl && supabaseKey) {
        try {
          // Get events count
          const eventsResponse = await fetch(`${supabaseUrl}/rest/v1/events?select=*`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            totalTranscripts = events.length;
            
            // Count today's events
            const today = new Date().toISOString().split('T')[0];
            transcriptsToday = events.filter(event => 
              event.created_at && event.created_at.startsWith(today)
            ).length;
            
            // Count active sessions (events with status 'Live')
            activeSessions = events.filter(event => event.status === 'Live').length;
          }
        } catch (err) {
          console.warn('Could not fetch Supabase data:', err);
        }
      }
      
      return {
        active_sessions: activeSessions, // REAL: actual live events
        api_calls_today: 0, // REAL: no tracking implemented yet - shows 0 until real tracking added
        total_transcripts: totalTranscripts, // REAL: from Supabase
        transcripts_today: transcriptsToday, // REAL: from Supabase  
        daily_cost: 0, // REAL: no cost tracking implemented yet
        monthly_cost_estimate: 0, // REAL: no cost tracking implemented yet
        cost_breakdown: {
          azure_speech: 0, // REAL: no usage tracking yet
          deepl_translation: 0, // REAL: no usage tracking yet
          openai_tts_llm: 0, // REAL: no usage tracking yet
          infrastructure: 0 // REAL: no fixed costs tracked yet
        }
      };
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      // Return ZERO data when error - no fake numbers
      return {
        active_sessions: 0,
        api_calls_today: 0,
        total_transcripts: 0,
        transcripts_today: 0,
        daily_cost: 0,
        monthly_cost_estimate: 0,
        cost_breakdown: {
          azure_speech: 0,
          deepl_translation: 0,
          openai_tts_llm: 0,
          infrastructure: 0
        }
      };
    }
  }

  // Get real API health from actual user activity
  async fetchApiStatus() {
    try {
      // Import the health monitor (dynamic import for client-side only)
      const { default: apiHealthMonitor } = await import('@/utils/apiHealthMonitor');
      const healthData = apiHealthMonitor.getAllApiHealth();
      
      const services = [];
      
      // Add monitored APIs with real health data
      Object.entries(healthData).forEach(([name, health]) => {
        services.push({
          name,
          status: health.status,
          uptime: health.uptime,
          response_time: health.response_time,
          last_incident: health.last_incident,
          cost_per_hour: health.cost_per_hour,
          usage_today: health.usage_today
        });
      });
      
      // Only show Socket.io if we can actually reach it
      try {
        const socketStart = Date.now();
        await fetch('https://speechdev.onrender.com', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        const socketTime = Date.now() - socketStart;
        
        services.push({
          name: 'Socket.io Server',
          status: 'online',
          uptime: 100, // REAL: based on successful ping
          response_time: `${socketTime}ms`, // REAL: actual response time
          last_incident: 'None',
          cost_per_hour: '$0.00', // REAL: no cost tracking yet
          usage_today: 'Unknown' // REAL: no usage tracking yet
        });
      } catch {
        services.push({
          name: 'Socket.io Server',
          status: 'offline',
          uptime: 0, // REAL: failed to connect
          response_time: 'Failed',
          last_incident: 'Connection failed',
          cost_per_hour: '$0.00',
          usage_today: 'Unavailable'
        });
      }
      
      return services;
    } catch (error) {
      console.error('Error fetching API health:', error);
      // Return empty array when error - no fake data
      return [];
    }
  }

  // Get REAL cost analytics - only actual tracked costs
  async fetchCostAnalytics() {
    try {
      // NO FAKE COST DATA - only return real tracked costs
      return {
        daily_total: 0, // REAL: no cost tracking implemented yet
        monthly_total: 0, // REAL: no cost tracking implemented yet  
        cost_breakdown: {
          azure_speech: {
            requests: 0, // REAL: no usage tracking implemented yet
            cost_per_request: 0.01,
            daily_cost: 0,
            monthly_estimate: 0
          },
          deepl_translation: {
            requests: 0, // REAL: no usage tracking implemented yet
            cost_per_request: 0.02,
            daily_cost: 0,
            monthly_estimate: 0
          },
          openai_tts_llm: {
            requests: 0, // REAL: no usage tracking implemented yet
            cost_per_request: 0.015,
            daily_cost: 0,
            monthly_estimate: 0
          },
          infrastructure: {
            services: ['Socket.io Server', 'Supabase Pro', 'Firebase', 'Render Hosting'],
            daily_cost: 0, // REAL: no cost tracking implemented yet
            monthly_estimate: 0
          }
        },
        cost_trend: [], // REAL: no historical data tracked yet
        highest_cost_service: 'none', // REAL: no costs tracked yet
        cost_per_transcript: 0 // REAL: no costs tracked yet
      };
    } catch (error) {
      console.error('Error calculating cost analytics:', error);
      // Return ZERO data when error - no fake numbers
      return {
        daily_total: 0,
        monthly_total: 0,
        cost_breakdown: {
          azure_speech: { requests: 0, cost_per_request: 0.01, daily_cost: 0, monthly_estimate: 0 },
          deepl_translation: { requests: 0, cost_per_request: 0.02, daily_cost: 0, monthly_estimate: 0 },
          openai_tts_llm: { requests: 0, cost_per_request: 0.015, daily_cost: 0, monthly_estimate: 0 },
          infrastructure: { services: [], daily_cost: 0, monthly_estimate: 0 }
        },
        cost_trend: [],
        highest_cost_service: 'none',
        cost_per_transcript: 0
      };
    }
  }

  // Helper method to check backend health
  async checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000 // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService; 