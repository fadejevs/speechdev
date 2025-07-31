# API Health Monitoring System

This system automatically tracks the health of your APIs based on **real user activity** - no costly test calls needed!

## How it Works

1. **Real Usage Tracking**: Monitors actual API calls made by users
2. **Zero Cost**: No wasteful ping/test requests 
3. **Automatic Monitoring**: Just replace `fetch` with `monitoredFetch`
4. **Real-time Dashboard**: Shows live health data in System Analytics

## Integration Examples

### Option 1: Replace fetch calls

```javascript
// Before (regular fetch)
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'hello', target_lang: 'ES' })
});

// After (monitored fetch) 
import { monitoredFetch } from '@/utils/monitoredFetch';

const response = await monitoredFetch('/api/translate', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'hello', target_lang: 'ES' })
});
```

### Option 2: Use pre-built API functions

```javascript
import { monitoredApiCall } from '@/utils/monitoredFetch';

// Translation
const response = await monitoredApiCall.translate('hello', 'ES');

// Text-to-Speech  
const audioResponse = await monitoredApiCall.textToSpeech('hello', 'alloy');

// OpenAI Chat
const chatResponse = await monitoredApiCall.openaiChat([
  { role: 'user', content: 'Hello' }
]);

// Supabase calls
const supabaseResponse = await monitoredApiCall.supabase(
  'https://your-project.supabase.co/rest/v1/events',
  { headers: { apikey: 'your-key' } }
);
```

## What Gets Tracked

- ✅ **Success/Error rates** - Real uptime percentage
- ✅ **Response times** - Actual performance data  
- ✅ **Usage counts** - How many calls today
- ✅ **Error patterns** - Consecutive failures detected
- ✅ **Last incident** - When things went wrong

## Viewing the Data

1. Go to **My Events → System Analytics** in the sidebar
2. View **API Services Status** section
3. See real health data based on actual usage

## API Health States

- 🟢 **Online**: Recent successful calls, no errors
- 🟡 **Degraded**: Recent errors or slow responses  
- 🔴 **Offline**: Multiple consecutive errors
- ⚪ **Unknown**: No recent activity to analyze

## Data Storage

- Uses browser `localStorage` to persist health data
- Automatically cleans up old data (7 days)
- Data is user-specific and stays on their device

## Zero Cost Monitoring

Unlike traditional health checks that ping APIs constantly (costing money), this system:
- ❌ No test API calls
- ❌ No scheduled pings
- ❌ No wasted API credits
- ✅ Only monitors real user activity
- ✅ Provides genuine health insights
- ✅ Shows actual performance data 