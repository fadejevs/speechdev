import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isMobile,
  isSafari,
  isIOS,
  playSilentAudio,
  createSilentAudioBlob,
  initializeAudioContext,
  getLanguageCode,
  getBaseLangCode
} from './utils';

// These are global because they manage a single audio state for the entire app,
// preventing multiple instances of the hook from clashing.
let currentAudioRef = null;
let isAudioPlaying = false;
let openAITTSQueue = [];
let isProcessingOpenAIQueue = false;

const speakWithOpenAIImmediate = async (text, lang, eventData) => {
  try {
    isAudioPlaying = true;
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
      isAudioPlaying = false;
      return false;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioRef = audio;

    if (isMobile()) {
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        isAudioPlaying = false;
      };

      audio.onended = () => {
        cleanup();
        resolve(true);
      };
      audio.onerror = () => {
        cleanup();
        resolve(false);
      };

      audio.play().catch(() => {
        cleanup();
        resolve(false);
      });
    });
  } catch {
    isAudioPlaying = false;
    return false;
  }
};

const processOpenAITTSQueue = async (eventData) => {
  if (isProcessingOpenAIQueue || openAITTSQueue.length === 0) return;

  isProcessingOpenAIQueue = true;
  while (openAITTSQueue.length > 0) {
    const { text, lang, resolve } = openAITTSQueue.shift();
    const success = await speakWithOpenAIImmediate(text, lang, eventData);
    resolve(success);
  }
  isProcessingOpenAIQueue = false;
};

const speakWithOpenAI = (text, lang, eventData) => {
  return new Promise((resolve) => {
    openAITTSQueue.push({ text, lang, resolve });
    processOpenAITTSQueue(eventData);
  });
};



const speakTextMobileQueued = async (text, lang, eventData, audioContextRef) => {
  try {
    // For mobile, we need to ensure audio context is active
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Stop any currently playing audio
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.src = '';
    }

    // Create a simple audio element for mobile
    const audio = new Audio();
    
    // Mobile-specific setup
    if (isMobile()) {
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      // Set volume to ensure it's not muted
      audio.volume = 1.0;
    }

    currentAudioRef = audio;
    isAudioPlaying = true;

    // Get TTS audio directly without silent audio trick
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
      isAudioPlaying = false;
      return false;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    audio.src = audioUrl;

    return new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        isAudioPlaying = false;
      };

      audio.onended = () => {
        cleanup();
        resolve(true);
      };
      
      audio.onerror = () => {
        cleanup();
        resolve(false);
      };

      audio.play().catch(() => {
        cleanup();
        resolve(false);
      });
    });
  } catch {
    isAudioPlaying = false;
    return false;
  }
};

export const useTts = (eventData) => {

  const [ttsLoading, setTtsLoading] = useState(false);
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);
  


  const audioContextRef = useRef(null);
  const spokenSentences = useRef(new Set());
  const mobileTtsQueue = useRef([]);
  const isMobileSpeaking = useRef(false);
  const mobileTtsTimeout = useRef(null);
  const keepAliveInterval = useRef(null);
  
  // Mobile audio management
  const lastSuccessfulPlay = useRef(Date.now());
  const autoPlayFailureCount = useRef(0);

  useEffect(() => {
    if (isSafari() || isIOS()) {
      audioContextRef.current = initializeAudioContext();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const stopTts = useCallback(() => {
    console.log('[TTS] Stop command received. Halting all audio.');
    if (currentAudioRef) {
      currentAudioRef.pause();
      currentAudioRef.src = ''; // Detach source
    }
    // Clear all queues
    mobileTtsQueue.current = [];
    openAITTSQueue = [];
    // Reset flags
    isProcessingOpenAIQueue = false;
    isMobileSpeaking.current = false;
    // Clear timers
    if (mobileTtsTimeout.current) clearTimeout(mobileTtsTimeout.current);
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
  }, []);

    const processMobileQueue = useCallback(async () => {
    if (isMobileSpeaking.current || mobileTtsQueue.current.length === 0) return;

    isMobileSpeaking.current = true;
    
    while (mobileTtsQueue.current.length > 0 && autoSpeakLang) {
      const item = mobileTtsQueue.current.shift();
      
      try {
        const success = await speakTextMobileQueued(item.text, item.lang, eventData, audioContextRef);
        
        if (success) {
          lastSuccessfulPlay.current = Date.now();
          autoPlayFailureCount.current = 0;
        } else {
          autoPlayFailureCount.current++;
        }
        
        // Longer delay for mobile to ensure audio session stability
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        autoPlayFailureCount.current++;
      }
    }

    isMobileSpeaking.current = false;
    
    // Continue processing if more items were added
    if (mobileTtsQueue.current.length > 0) {
      setTimeout(processMobileQueue, 200);
    }
  }, [eventData, autoSpeakLang]);

  const queueForTTS = useCallback(
    (text, lang) => {
      if (spokenSentences.current.has(text)) return;
      spokenSentences.current.add(text);

      if (isMobile()) {
        if (text && text.trim().length >= 10) {
          const item = { text: text.trim(), lang };
          mobileTtsQueue.current.push(item);
          
          // Ensure audio context is active before processing
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
          }
          
          if (!isMobileSpeaking.current) {
            // Small delay to ensure audio context is ready
            setTimeout(() => {
              processMobileQueue();
            }, 100);
          }
        }
      } else {
        // Desktop unchanged - keep auto-play working
        speakWithOpenAI(text.trim(), lang, eventData);
      }
    },
    [eventData, processMobileQueue]
  );



  const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      if (autoSpeakLang) {
        // Turn off TTS
        setAutoSpeakLang(null);
        stopTts();
      } else {
        // Turn on TTS
        setTtsLoading(true);
        try {
          // Reset everything for fresh start
          spokenSentences.current.clear();
          mobileTtsQueue.current = [];
          isMobileSpeaking.current = false;
          autoPlayFailureCount.current = 0;

          // Ensure audio context is active for mobile
          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          // Initialize audio session with a silent audio for mobile
          if (isMobile()) {
            const silentBlob = createSilentAudioBlob();
            const silentAudio = new Audio(URL.createObjectURL(silentBlob));
            silentAudio.volume = 0;
            await silentAudio.play().catch(() => {});
            setTimeout(() => {
              URL.revokeObjectURL(silentAudio.src);
            }, 1000);
          }

          const targetLang = getLanguageCode(currentTranslationLanguage);
          const langCode = getBaseLangCode(targetLang);
          setAutoSpeakLang(langCode);

          if (isMobile()) {
            if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
            keepAliveInterval.current = setInterval(() => {
              if (!isAudioPlaying) {
                playSilentAudio();
              }
              if (audioContextRef.current && audioContextRef.current.state !== 'running') {
                audioContextRef.current.resume().catch(() => {});
              }
            }, 5000); // More frequent keep-alive for mobile
          }
        } finally {
          setTtsLoading(false);
        }
      }
    },
    [autoSpeakLang, stopTts]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoSpeakLang && isMobile()) {
        console.log('[Visibility] App became visible. Re-pinging audio session.');
        playSilentAudio();
        // Also try to resume the audio context just in case
        if (audioContextRef.current && audioContextRef.current.state !== 'running') {
            audioContextRef.current.resume().catch(() => {});
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
      const timeout = mobileTtsTimeout.current; // Copy ref to variable for cleanup
      if (timeout) clearTimeout(timeout);
    };
  }, [autoSpeakLang]);

  return {
    ttsLoading,
    autoSpeakLang,
    setAutoSpeakLang,
    queueForTTS,
    handleMobilePlayToggle,
    spokenSentences, // Pass this down to clear it on lang change
    stopTts
  };
};
