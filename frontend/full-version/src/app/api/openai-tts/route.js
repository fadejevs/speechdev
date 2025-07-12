import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get client info for debugging
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('[OpenAI TTS] Request received', {
      isMobile,
      userAgent: userAgent.substring(0, 50) + '...',
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    });

    const { text, voice = 'alloy', speed = 1.0 } = await request.json();
    
    if (!text) {
      console.error('[OpenAI TTS] No text provided');
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[OpenAI TTS] OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Validate API key format
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('[OpenAI TTS] Invalid API key format');
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 500 });
    }

    console.log('[OpenAI TTS] Generating speech', {
      textLength: text.length,
      voice,
      speed,
      isMobile
    });
    
    // Call OpenAI TTS API with enhanced error handling
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': `SpeechApp/1.0 ${isMobile ? 'Mobile' : 'Desktop'}`
      },
      body: JSON.stringify({
        model: 'tts-1', // Use tts-1 for faster response on mobile
        input: text,
        voice: voice,
        speed: speed,
        response_format: 'mp3'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI TTS] API Error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        isMobile
      });
      
      // Return specific error messages for debugging
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'OpenAI API authentication failed. Please check your API key.',
            details: errorText,
            isMobile
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
          details: errorText,
          isMobile
        },
        { status: response.status }
      );
    }

    // Return the audio stream with mobile-optimized headers
    const audioBuffer = await response.arrayBuffer();
    
    console.log('[OpenAI TTS] ✅ Generated audio', {
      size: audioBuffer.byteLength,
      isMobile
    });
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache', // Prevent caching issues on mobile
        'Access-Control-Allow-Origin': '*', // Allow mobile access
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });

  } catch (error) {
    console.error('[OpenAI TTS] Server error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 