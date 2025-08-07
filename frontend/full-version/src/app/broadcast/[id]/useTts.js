import { useState, useEffect, useRef, useCallback } from 'react';
import { isMobile, isSafari, isIOS, initializeAudioContext, getLanguageCode, getBaseLangCode } from './utils';

// These are global because they manage a single audio state for the entire app,
// preventing multiple instances of the hook from clashing.
let currentAudioSource = null;
let openAITTSQueue = [];
let isProcessingOpenAIQueue = false;

const speakWithOpenAIImmediate = async (text, lang, eventData, setIsSpeaking, audioContextRef) => {
  try {
    console.log('[TTS] Starting TTS for:', text.substring(0, 50) + '...');
    
    // Stop any currently playing audio first
    if (currentAudioSource) {
      try {
        currentAudioSource.stop();
      } catch {
        // Audio source might already be stopped
      }
      currentAudioSource = null;
    }

    if (setIsSpeaking) setIsSpeaking(true);
    const getVoiceForLanguage = (langCode, voiceType = 'female') => {
      const voiceMap = {
        female: {
          en: 'nova',
          es: 'nova',
          fr: 'shimmer',
          de: 'shimmer',
          it: 'nova',
          pt: 'nova',
          zh: 'nova',
          ja: 'nova',
          ko: 'nova',
          ru: 'shimmer',
          ar: 'nova',
          hi: 'shimmer',
          default: 'nova'
        },
        male: {
          en: 'echo',
          es: 'onyx',
          fr: 'echo',
          de: 'onyx',
          it: 'echo',
          pt: 'onyx',
          zh: 'echo',
          ja: 'echo',
          ko: 'echo',
          ru: 'onyx',
          ar: 'echo',
          hi: 'onyx',
          default: 'echo'
        }
      };
      return voiceMap[voiceType]?.[langCode] || voiceMap[voiceType]?.default || 'alloy';
    };

    const voiceType = eventData?.tts_voice || 'female';
    const voice = getVoiceForLanguage(lang, voiceType);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/api/openai-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 1 }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[TTS] API response not ok:', response.status);
      return false;
    }

    const audioBlob = await response.blob();
    console.log('[TTS] Got audio blob, size:', audioBlob.size);
    
    // Hybrid approach: Use HTML5 Audio for initial user gesture, Web Audio API for autoplay
    let audioUrl = null;
    if (isMobile() && !audioContextRef.current) {
      // First time on mobile - use HTML5 Audio within user gesture
      console.log('[TTS] Using HTML5 Audio for initial mobile gesture');
      audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioSource = audio;
    } else {
      // Use Web Audio API for autoplay (works after first gesture)
      console.log('[TTS] Using Web Audio API for autoplay');
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Get or create AudioContext
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        console.log('[TTS] Creating new AudioContext');
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioContext;
          console.log('[TTS] AudioContext created successfully');
        } catch (error) {
          console.error('[TTS] Failed to create AudioContext:', error);
          return false;
        }
      }
      
      console.log('[TTS] AudioContext state:', audioContext.state);
      
      // Ensure AudioContext is running
      if (audioContext.state !== 'running') {
        console.log('[TTS] Resuming AudioContext...');
        try {
          await audioContext.resume();
          console.log('[TTS] AudioContext state after resume:', audioContext.state);
        } catch (error) {
          console.error('[TTS] Failed to resume AudioContext:', error);
          return false;
        }
      }
      
      // Decode the audio data
      console.log('[TTS] Decoding audio data...');
      let audioBuffer;
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('[TTS] Audio decoded, duration:', audioBuffer.duration);
      } catch (error) {
        console.error('[TTS] Failed to decode audio data:', error);
        return false;
      }
      
      // Create and play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      currentAudioSource = source;
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        console.log('[TTS] Cleanup called');
        if (setIsSpeaking) setIsSpeaking(false);
        currentAudioSource = null;
      };

      if (currentAudioSource.pause) {
        // HTML5 Audio
        const audio = currentAudioSource;
        
        audio.onended = () => {
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          cleanup();
          resolve(true);
        };

        audio.onerror = (error) => {
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          console.error('[TTS] HTML5 Audio error:', error);
          cleanup();
          resolve(false);
        };

        // Start playing immediately
        console.log('[TTS] Starting HTML5 Audio playback...');
        audio.play().then(() => {
          console.log('[TTS] HTML5 Audio started successfully');
        }).catch((error) => {
          console.error('[TTS] Failed to start HTML5 Audio:', error);
          cleanup();
          resolve(false);
        });
      } else {
        // Web Audio API
        const source = currentAudioSource;
        
        source.onended = () => {
          console.log('[TTS] Web Audio ended successfully');
          cleanup();
          resolve(true);
        };

        source.onerror = (error) => {
          console.error('[TTS] Web Audio error:', error);
          cleanup();
          resolve(false);
        };

        // Start playing immediately
        console.log('[TTS] Starting Web Audio playback...');
        try {
          source.start(0);
          console.log('[TTS] Web Audio started successfully');
        } catch (error) {
          console.error('[TTS] Failed to start Web Audio:', error);
          cleanup();
          resolve(false);
        }
      }
    });
  } catch {
    if (setIsSpeaking) setIsSpeaking(false);
    return false;
  }
};

const processOpenAITTSQueue = async (eventData, audioContextRef) => {
  if (isProcessingOpenAIQueue || openAITTSQueue.length === 0) return;

  isProcessingOpenAIQueue = true;
  while (openAITTSQueue.length > 0) {
    const { text, lang, resolve } = openAITTSQueue.shift();
    const success = await speakWithOpenAIImmediate(text, lang, eventData, null, audioContextRef);
    resolve(success);
  }
  isProcessingOpenAIQueue = false;
};

const speakWithOpenAI = (text, lang, eventData, audioContextRef) => {
  return new Promise((resolve) => {
    openAITTSQueue.push({ text, lang, resolve });
    processOpenAITTSQueue(eventData, audioContextRef);
  });
};

export const useTts = (eventData) => {
  const [ttsLoading, setTtsLoading] = useState(false);
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef(null);
  const spokenSentences = useRef(new Set());
  const keepAliveInterval = useRef(null);

  // Seamless audio route resync function
  const resyncAudioRoute = useCallback(async () => {
    if (!isMobile()) return; // Only on mobile
    
    console.log('[TTS] Seamlessly resyncing audio route...');
    
    // Stop any playing audio
    if (currentAudioSource) {
      try {
        if (currentAudioSource.stop) currentAudioSource.stop();
        if (currentAudioSource.pause) {
          currentAudioSource.pause();
          currentAudioSource.src = '';
        }
      } catch (err) {}
      currentAudioSource = null;
    }

    // Close old context
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (err) {}
    }

    // Create new context
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      await audioContextRef.current.resume();
      console.log('[TTS] AudioContext seamlessly resynced to current device');
    } catch (err) {
      console.error('[TTS] Failed to recreate AudioContext:', err);
    }
  }, []);

  useEffect(() => {
    if (isSafari() || isIOS()) {
      audioContextRef.current = initializeAudioContext();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const stopTts = useCallback(() => {
    if (currentAudioSource) {
      try {
        if (currentAudioSource.pause) {
          // HTML5 Audio
          currentAudioSource.pause();
          currentAudioSource.src = '';
        } else {
          // Web Audio API
          currentAudioSource.stop();
        }
      } catch {
        // Audio source might already be stopped
      }
      currentAudioSource = null;
    }
    // Clear all queues
    openAITTSQueue = [];
    // Reset flags
    isProcessingOpenAIQueue = false;
    setIsSpeaking(false);
    // Clear timers
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
  }, [setIsSpeaking]);

  const queueForTTS = useCallback(
    (text, lang) => {
      console.log('[TTS] queueForTTS called with:', text.substring(0, 30) + '...', 'lang:', lang, 'autoSpeakLang:', autoSpeakLang);
      
      if (spokenSentences.current.has(text)) {
        console.log('[TTS] Text already spoken, skipping');
        return;
      }

      // Now both mobile and desktop can play immediately with Web Audio API
      if (autoSpeakLang) {
        console.log('[TTS] Adding to spoken sentences and queuing TTS');
        spokenSentences.current.add(text);
        speakWithOpenAI(text.trim(), lang, eventData, audioContextRef);
      } else {
        console.log('[TTS] TTS not enabled (autoSpeakLang is null)');
      }
    },
    [eventData, autoSpeakLang]
  );

    const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      console.log('[TTS] Mobile toggle called, current autoSpeakLang:', autoSpeakLang);
      
      if (autoSpeakLang) {
        // Turn off TTS
        console.log('[TTS] Turning off TTS');
        setAutoSpeakLang(null);
        stopTts();
      } else {
        // Turn on TTS
        console.log('[TTS] Turning on TTS');
        setTtsLoading(true);
        try {
          // Reset everything for fresh start
          spokenSentences.current.clear();

          const targetLang = getLanguageCode(currentTranslationLanguage);
          const langCode = getBaseLangCode(targetLang);
          console.log('[TTS] Target language:', targetLang, 'Lang code:', langCode);
          
          // Initialize audio session with user interaction
          if (audioContextRef.current && audioContextRef.current.state !== 'running') {
            console.log('[TTS] Resuming AudioContext for mobile toggle');
            await audioContextRef.current.resume();
          }

          // Test TTS with a confirmation message within the user gesture
          console.log('[TTS] Testing TTS with "Activated" message');
          const success = await speakWithOpenAIImmediate('Activated', langCode, eventData, setIsSpeaking, audioContextRef);
          console.log('[TTS] TTS test result:', success);
          
          if (success) {
            setAutoSpeakLang(langCode);
            console.log('[TTS] TTS activated successfully');
          } else {
            console.error('[TTS] Failed to activate TTS');
          }
        } finally {
          setTtsLoading(false);
        }
      }
    },
    [autoSpeakLang, stopTts, eventData]
  );

  // 1. Seamless resync when user returns to app (likely connected AirPods)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoSpeakLang && isMobile()) {
        console.log('[TTS] User returned to app - resyncing audio route');
        resyncAudioRoute();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoSpeakLang, resyncAudioRoute]);

  // 2. Periodic seamless resync every 10 seconds (backup)
  useEffect(() => {
    if (!autoSpeakLang || !isMobile()) return;
    
    console.log('[TTS] Starting periodic audio resync (every 10s)');
    const interval = setInterval(resyncAudioRoute, 10000); // Every 10s
    
    return () => {
      console.log('[TTS] Stopping periodic audio resync');
      clearInterval(interval);
    };
  }, [autoSpeakLang, resyncAudioRoute]);

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      const interval = keepAliveInterval.current;
      if (interval) clearInterval(interval);
    };
  }, []);

  return {
    ttsLoading,
    autoSpeakLang,
    setAutoSpeakLang,
    queueForTTS,
    handleMobilePlayToggle,
    spokenSentences,
    stopTts,
    isSpeaking,
    resyncAudioRoute // Available for debugging if needed
  };
};
