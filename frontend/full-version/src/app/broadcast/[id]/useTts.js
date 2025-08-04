import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isMobile,
  isSafari,
  isIOS,
  initializeAudioContext,
  getLanguageCode,
  getBaseLangCode
} from './utils';

// These are global because they manage a single audio state for the entire app,
// preventing multiple instances of the hook from clashing.
let currentAudioRef = null;
let openAITTSQueue = [];
let isProcessingOpenAIQueue = false;

const speakWithOpenAIImmediate = async (text, lang, eventData, setIsSpeaking) => {
  try {
    // Stop any currently playing audio first
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.src = '';
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
        if (setIsSpeaking) setIsSpeaking(false);
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
          audio.play().catch((err) => {
            console.error('Mobile TTS playback failed:', err);
            cleanup();
            resolve(false);
          });
        }, 50);
      } else {
        audio.play().catch((err) => {
          console.error('Desktop TTS playback failed:', err);
          cleanup();
          resolve(false);
        });
      }
    });
  } catch {
    if (setIsSpeaking) setIsSpeaking(false);
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mobilePendingCount, setMobilePendingCount] = useState(0);

  const audioContextRef = useRef(null);
  const spokenSentences = useRef(new Set());
  const keepAliveInterval = useRef(null);
  const mobilePendingSentences = useRef([]);

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
    setIsSpeaking(false);
    // Clear timers
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
  }, [setIsSpeaking]);

  const queueForTTS = useCallback(
    (text, lang) => {
      if (spokenSentences.current.has(text)) return;

      if (isMobile()) {
        // Mobile: Store pending sentences, don't play automatically  
        if (autoSpeakLang) {
          mobilePendingSentences.current.push({ text: text.trim(), lang });
          setMobilePendingCount(mobilePendingSentences.current.length);
        }
      } else {
        // Desktop: Use queue system and mark as spoken
        spokenSentences.current.add(text);
        speakWithOpenAI(text.trim(), lang, eventData);
      }
    },
    [eventData, autoSpeakLang]
  );

  // Function to play all pending mobile sentences within user gesture
  const playPendingMobileSentences = useCallback(async () => {
    if (mobilePendingSentences.current.length === 0) return;

    setTtsLoading(true);
    try {
      // Ensure audio context is running
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        await audioContextRef.current.resume();
      }

      // Set speaking state once for the entire sequence
      setIsSpeaking(true);

      // Play all pending sentences in sequence
      for (const { text, lang } of mobilePendingSentences.current) {
        const success = await speakWithOpenAIImmediate(text, lang, eventData, null); // Don't manage state per sentence
        if (success) {
          // Mark as spoken after successful playback
          spokenSentences.current.add(text);
        } else {
          console.error('Failed to play sentence:', text);
        }
        // Small delay between sentences for mobile stability
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Clear speaking state after all sentences are done
      setIsSpeaking(false);

      // Clear pending sentences
      mobilePendingSentences.current = [];
      setMobilePendingCount(0);
    } catch (error) {
      console.error('Mobile TTS playback error:', error);
    } finally {
      setTtsLoading(false);
    }
  }, [eventData, setIsSpeaking]);

  const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      if (autoSpeakLang) {
        // If we have pending sentences, play them (within user gesture)
        if (mobilePendingSentences.current.length > 0) {
          await playPendingMobileSentences();
        } else {
          // No pending sentences, turn off TTS
          setAutoSpeakLang(null);
          mobilePendingSentences.current = [];
          setMobilePendingCount(0);
          stopTts();
        }
      } else {
        // Turn on TTS
        setTtsLoading(true);
        try {
          // Reset everything for fresh start
          spokenSentences.current.clear();
          mobilePendingSentences.current = [];
          setMobilePendingCount(0);

          const targetLang = getLanguageCode(currentTranslationLanguage);
          const langCode = getBaseLangCode(targetLang);
          
          if (isMobile()) {
            // Mobile: Initialize audio session with user interaction
            if (audioContextRef.current && audioContextRef.current.state !== 'running') {
              await audioContextRef.current.resume();
            }


            // Skip silent audio due to CSP restrictions
            // const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAABDW7QAgdIlRglJlZZlzJFEogAhQDBAGLGnIgMAAS8pUU1MNhPdQR1BQYEZ3OjOEgAhB9vkAAAAIgAhB9vkAAAAIgAhB9vkAAAAAWEltTAAACGwAAAPIQOkQpoBQDBAGLGnIgMAAS8pUU1MNhPdQR1BQYEZ3OjOEgAhB9vkAAAAIgAhB9vkAAAAIgAhB9vkAAAAA=');
            // audio.volume = 0;
            // await audio.play();
            // setTimeout(() => URL.revokeObjectURL(audio.src), 100);

            // Immediately test TTS with a confirmation message within the user gesture
            await speakWithOpenAIImmediate('Activated', langCode, eventData, setIsSpeaking);
          }
          
          setAutoSpeakLang(langCode);
        } finally {
          setTtsLoading(false);
        }
      }
    },
    [autoSpeakLang, stopTts, playPendingMobileSentences, eventData]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoSpeakLang && isMobile()) {
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
    isSpeaking,
    mobilePendingCount
  };
};
