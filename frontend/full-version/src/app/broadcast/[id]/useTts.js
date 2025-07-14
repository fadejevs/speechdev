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

    const voiceType = eventData?.ttsVoice || 'female';
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
    await new Promise((res) => setTimeout(res, 100));
  }
  isProcessingOpenAIQueue = false;
};

const speakWithOpenAI = (text, lang, eventData) => {
  return new Promise((resolve) => {
    openAITTSQueue.push({ text, lang, resolve });
    processOpenAITTSQueue(eventData);
  });
};

const swapToOpenAIAudio = async (audioElement, text, lang, eventData) => {
  let tempKeepAlive;
  try {
    tempKeepAlive = setInterval(playSilentAudio, 4000);

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

    const voiceType = eventData?.ttsVoice || 'female';
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
    if (!response.ok) return false;

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    audioElement.src = audioUrl;
    audioElement.load();

    return new Promise((resolve) => {
      const cleanup = () => {
        if (tempKeepAlive) clearInterval(tempKeepAlive);
        URL.revokeObjectURL(audioUrl);
        isAudioPlaying = false;
      };

      audioElement.onended = () => {
        cleanup();
        resolve(true);
      };
      audioElement.onerror = () => {
        cleanup();
        resolve(false);
      };

      audioElement.play().catch(() => {
        cleanup();
        resolve(false);
      });
    });
  } catch {
    return false;
  } finally {
    if (tempKeepAlive) clearInterval(tempKeepAlive);
  }
};

const speakTextMobileQueued = async (text, lang, eventData, audioContextRef) => {
  try {
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const silentBlob = createSilentAudioBlob();
    const silentBlobURL = URL.createObjectURL(silentBlob);
    const placeholderAudio = new Audio(silentBlobURL);

    const cleanupBlob = () => URL.revokeObjectURL(silentBlobURL);
    placeholderAudio.addEventListener('ended', cleanupBlob);
    placeholderAudio.addEventListener('error', cleanupBlob);

    if (isMobile()) {
      placeholderAudio.preload = 'auto';
    }

    currentAudioRef = placeholderAudio;
    isAudioPlaying = true;

    await placeholderAudio.play();

    return await swapToOpenAIAudio(placeholderAudio, text, lang, eventData);
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
    const item = mobileTtsQueue.current.shift();

    await speakTextMobileQueued(item.text, item.lang, eventData, audioContextRef);

    isMobileSpeaking.current = false;
    if (mobileTtsQueue.current.length > 0) {
      mobileTtsTimeout.current = setTimeout(processMobileQueue, 150);
    }
  }, [eventData]);

  const queueForTTS = useCallback(
    (text, lang) => {
      if (spokenSentences.current.has(text)) return;
      spokenSentences.current.add(text);

      if (isMobile()) {
        if (text && text.trim().length >= 10) {
          mobileTtsQueue.current.push({ text: text.trim(), lang });
          if (!isMobileSpeaking.current) {
            processMobileQueue();
          }
        }
      } else {
        speakWithOpenAI(text.trim(), lang, eventData);
      }
    },
    [eventData, processMobileQueue]
  );

  const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      if (autoSpeakLang) {
        setAutoSpeakLang(null);
        stopTts();
      } else {
        setTtsLoading(true);
        try {
          spokenSentences.current.clear();
          mobileTtsQueue.current = [];
          isMobileSpeaking.current = false;

          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          const targetLang = getLanguageCode(currentTranslationLanguage);
          const langCode = getBaseLangCode(targetLang);
          setAutoSpeakLang(langCode);

          if (isMobile()) {
            if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
            keepAliveInterval.current = setInterval(() => {
              if (!isAudioPlaying) playSilentAudio();
            }, 15000);
          }
        } finally {
          setTtsLoading(false);
        }
      }
    },
    [autoSpeakLang, stopTts]
  );

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
      if (mobileTtsTimeout.current) clearTimeout(mobileTtsTimeout.current);
    };
  }, []);

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
