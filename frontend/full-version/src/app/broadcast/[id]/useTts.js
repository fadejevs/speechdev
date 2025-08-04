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
let openAITTSQueue = [];
let isProcessingOpenAIQueue = false;

const speakWithOpenAIImmediate = async (text, lang, eventData) => {
  try {
    // Stop any currently playing audio first
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.src = '';
    }

    // Set audio playing state
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
      return false;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioRef = audio;

    // Mobile-specific optimizations
    if (isMobile()) {
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = 1.0; // Ensure full volume
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => {
        cleanup();
        resolve(true);
      };
      audio.onerror = () => {
        cleanup();
        resolve(false);
      };

      // For mobile, add a small delay to ensure audio is ready
      if (isMobile()) {
        setTimeout(() => {
          audio.play().catch(() => {
            cleanup();
            resolve(false);
          });
        }, 50);
      } else {
        audio.play().catch(() => {
          cleanup();
          resolve(false);
        });
      }
    });
  } catch {
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


export const useTts = (eventData) => {
  const [ttsLoading, setTtsLoading] = useState(false);
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);
  const [mobileTtsReady, setMobileTtsReady] = useState(false); // New: indicates ready sentences

  const audioContextRef = useRef(null);
  const spokenSentences = useRef(new Set());
  const keepAliveInterval = useRef(null);
  const mobilePendingQueue = useRef([]); // New: queue for mobile ready sentences

  useEffect(() => {
    if (isSafari() || isIOS()) {
      audioContextRef.current = initializeAudioContext();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const stopTts = useCallback(() => {
    if (currentAudioRef) {
      currentAudioRef.pause();
      currentAudioRef.src = ''; // Detach source
    }
    // Clear all queues
    openAITTSQueue = [];
    // Reset flags
    isProcessingOpenAIQueue = false;
    // Clear timers
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
  }, []);

  const queueForTTS = useCallback(
    (text, lang) => {
      if (spokenSentences.current.has(text)) return;

      if (isMobile()) {
        // Mobile: Add to pending queue and show ready indicator (don't mark as spoken yet)
        mobilePendingQueue.current.push({ text: text.trim(), lang });
        setMobileTtsReady(true);
      } else {
        // Desktop: Use queue system as normal and mark as spoken
        spokenSentences.current.add(text);
        speakWithOpenAI(text.trim(), lang, eventData);
      }
    },
    [eventData]
  );

  // New function to play mobile pending queue
  const playMobilePendingQueue = useCallback(async () => {
    if (mobilePendingQueue.current.length === 0) return;

    setTtsLoading(true);
    setMobileTtsReady(false);

    try {
      // Play all pending sentences
      for (const item of mobilePendingQueue.current) {
        await speakWithOpenAIImmediate(item.text, item.lang, eventData);
        // Mark as spoken after successful playback
        spokenSentences.current.add(item.text);
      }
      
      // Clear the pending queue after playing
      mobilePendingQueue.current = [];
    } finally {
      setTtsLoading(false);
    }
  }, [eventData]);

  const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      if (autoSpeakLang) {
        // Turn off TTS
        setAutoSpeakLang(null);
        setMobileTtsReady(false);
        mobilePendingQueue.current = [];
        stopTts();
      } else if (mobileTtsReady) {
        // Play pending sentences (mobile on-demand mode)
        await playMobilePendingQueue();
      } else {
        // Turn on TTS (first time setup)
        setTtsLoading(true);
        try {
          // Reset everything for fresh start
          spokenSentences.current.clear();
          mobilePendingQueue.current = [];

          const targetLang = getLanguageCode(currentTranslationLanguage);
          const langCode = getBaseLangCode(targetLang);
          
          if (isMobile()) {
            // Mobile: Initialize audio session with user interaction
            const silentBlob = createSilentAudioBlob();
            const audio = new Audio(URL.createObjectURL(silentBlob));
            audio.volume = 0;
            await audio.play();
            setTimeout(() => URL.revokeObjectURL(audio.src), 100);
          }
          
          setAutoSpeakLang(langCode);
        } finally {
          setTtsLoading(false);
        }
      }
    },
    [autoSpeakLang, mobileTtsReady, stopTts, playMobilePendingQueue]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoSpeakLang && isMobile()) {
        playSilentAudio();
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
    };
  }, [autoSpeakLang]);

  return {
    ttsLoading,
    autoSpeakLang,
    setAutoSpeakLang,
    queueForTTS,
    handleMobilePlayToggle,
    spokenSentences,
    stopTts,
    mobileTtsReady
  };
};
