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

const swapToOpenAIAudio = async (audioElement, text, lang, eventData) => {
  let tempKeepAlive;
  try {
    tempKeepAlive = setInterval(playSilentAudio, 4000);

    const getVoiceForLanguage = (langCode, voiceType = 'female') => {
      // Normalize language code (e.g., 'en-US' -> 'en')
      const normalizedLang = langCode ? langCode.split('-')[0].toLowerCase() : 'en';
      
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
          // Add more languages for broader support
          lv: 'nova',    // Latvian
          lt: 'nova',    // Lithuanian  
          et: 'nova',    // Estonian
          pl: 'shimmer', // Polish
          cs: 'shimmer', // Czech
          sk: 'shimmer', // Slovak
          hu: 'nova',    // Hungarian
          ro: 'nova',    // Romanian
          bg: 'shimmer', // Bulgarian
          hr: 'nova',    // Croatian
          sl: 'nova',    // Slovenian
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
          // Add more languages for broader support
          lv: 'echo',    // Latvian
          lt: 'echo',    // Lithuanian
          et: 'echo',    // Estonian  
          pl: 'onyx',    // Polish
          cs: 'onyx',    // Czech
          sk: 'onyx',    // Slovak
          hu: 'echo',    // Hungarian
          ro: 'echo',    // Romanian
          bg: 'onyx',    // Bulgarian
          hr: 'echo',    // Croatian
          sl: 'echo',    // Slovenian
          default: 'echo'
        }
      };
      
      console.log('[TTS Debug] SwapToOpenAI - Language normalization:', {
        originalLang: langCode,
        normalizedLang,
        voiceType,
        availableVoices: Object.keys(voiceMap[voiceType])
      });
      
      return voiceMap[voiceType]?.[normalizedLang] || voiceMap[voiceType]?.default || 'alloy';
    };

    const voiceType = eventData?.tts_voice || 'female';
    const voice = getVoiceForLanguage(lang, voiceType);
    
    // DEBUG: Log voice selection details for SwapToOpenAI
    console.log('[TTS Debug] SwapToOpenAI - Voice selection:', {
      lang,
      voiceType,
      selectedVoice: voice,
      eventDataTtsVoice: eventData?.tts_voice,
      hasEventData: !!eventData
    });

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
  
  // Mobile-specific states for smart batching
  const [mobileAutoPlayFailed, setMobileAutoPlayFailed] = useState(false);
  const [pendingBatchCount, setPendingBatchCount] = useState(0);

  const audioContextRef = useRef(null);
  const spokenSentences = useRef(new Set());
  const mobileTtsQueue = useRef([]);
  const isMobileSpeaking = useRef(false);
  const mobileTtsTimeout = useRef(null);
  const keepAliveInterval = useRef(null);
  
  // Mobile batch management
  const mobileBatchQueue = useRef([]);
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
    let consecutiveFailures = 0;
    
    while (mobileTtsQueue.current.length > 0 && autoSpeakLang) {
      const item = mobileTtsQueue.current.shift();
      
      try {
        const success = await speakTextMobileQueued(item.text, item.lang, eventData, audioContextRef);
        
        if (success) {
          lastSuccessfulPlay.current = Date.now();
          consecutiveFailures = 0;
          autoPlayFailureCount.current = 0;
          // If we were in batch mode, exit it since auto-play is working again
          if (mobileAutoPlayFailed) {
            setMobileAutoPlayFailed(false);
            setPendingBatchCount(0);
            mobileBatchQueue.current = [];
          }
        } else {
          consecutiveFailures++;
          autoPlayFailureCount.current++;
          
          // After 2 failures, switch to batch mode
          if (consecutiveFailures >= 2 && !mobileAutoPlayFailed) {
            console.log('[Mobile TTS] 📱 Auto-play failing, switching to batch mode');
            setMobileAutoPlayFailed(true);
            // Move remaining queue items to batch queue
            mobileBatchQueue.current.push(...mobileTtsQueue.current);
            mobileTtsQueue.current = [];
            setPendingBatchCount(mobileBatchQueue.current.length);
            break;
          }
        }
        
        // Small delay for natural flow
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('[Mobile TTS] Error processing item:', error);
        consecutiveFailures++;
      }
    }

    isMobileSpeaking.current = false;
    
    // Check if new items were added while processing
    if (mobileTtsQueue.current.length > 0 && autoSpeakLang && !mobileAutoPlayFailed) {
      setTimeout(processMobileQueue, 50);
    }
  }, [eventData, autoSpeakLang, mobileAutoPlayFailed]);

  const queueForTTS = useCallback(
    (text, lang) => {
      // DEBUG: Log when TTS is triggered and what eventData looks like
      console.log('[queueForTTS Debug] TTS triggered:', {
        text: text.substring(0, 50) + '...',
        lang,
        hasEventData: !!eventData,
        eventDataTtsVoice: eventData?.tts_voice,
        isMobile: isMobile(),
        batchMode: mobileAutoPlayFailed,
        timestamp: new Date().toISOString()
      });

      if (spokenSentences.current.has(text)) return;
      spokenSentences.current.add(text);

      if (isMobile()) {
        if (text && text.trim().length >= 10) {
          const item = { text: text.trim(), lang };
          
          // If we're in batch mode, add to batch queue instead
          if (mobileAutoPlayFailed) {
            mobileBatchQueue.current.push(item);
            setPendingBatchCount(mobileBatchQueue.current.length);
            console.log(`[Mobile TTS] 📚 Added to batch queue (${mobileBatchQueue.current.length} pending)`);
          } else {
            // Normal auto-play mode
            mobileTtsQueue.current.push(item);
            if (!isMobileSpeaking.current) {
              processMobileQueue();
            }
          }
        }
      } else {
        // Desktop unchanged - keep auto-play working
        speakWithOpenAI(text.trim(), lang, eventData);
      }
    },
    [eventData, processMobileQueue, mobileAutoPlayFailed]
  );

  // Play batched translations (mobile-only)
  const playBatch = useCallback(async () => {
    if (!isMobile() || isMobileSpeaking.current || mobileBatchQueue.current.length === 0) return;

    console.log(`[Mobile TTS] 🎵 Playing batch of ${mobileBatchQueue.current.length} translations`);
    setTtsLoading(true);
    isMobileSpeaking.current = true;

    try {
      // Resume audio context if needed
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const batchToPlay = [...mobileBatchQueue.current];
      mobileBatchQueue.current = [];
      setPendingBatchCount(0);

      // Play each item in the batch
      for (const item of batchToPlay) {
        try {
          const success = await speakTextMobileQueued(item.text, item.lang, eventData, audioContextRef);
          if (success) {
            lastSuccessfulPlay.current = Date.now();
            // Small delay between items for natural flow
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            console.warn('[Mobile TTS] Batch item failed, continuing with next');
          }
        } catch (error) {
          console.error('[Mobile TTS] Error in batch item:', error);
        }
      }

      // After playing batch, check if we can resume auto-play
      setTimeout(() => {
        if (mobileTtsQueue.current.length > 0) {
          processMobileQueue();
        }
      }, 500);

    } finally {
      isMobileSpeaking.current = false;
      setTtsLoading(false);
    }
  }, [eventData, processMobileQueue]);

  const handleMobilePlayToggle = useCallback(
    async (currentTranslationLanguage) => {
      if (autoSpeakLang) {
        // Turn off TTS
        setAutoSpeakLang(null);
        stopTts();
        setMobileAutoPlayFailed(false);
        setPendingBatchCount(0);
        mobileBatchQueue.current = [];
      } else {
        // Turn on TTS or play batch if in batch mode
        if (mobileAutoPlayFailed && mobileBatchQueue.current.length > 0) {
          // We're in batch mode with pending translations - play them
          await playBatch();
        } else {
          // Normal TTS activation
          setTtsLoading(true);
          try {
            // Reset everything for fresh start
            spokenSentences.current.clear();
            mobileTtsQueue.current = [];
            mobileBatchQueue.current = [];
            isMobileSpeaking.current = false;
            setMobileAutoPlayFailed(false);
            setPendingBatchCount(0);
            autoPlayFailureCount.current = 0;

            if (audioContextRef.current?.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            const targetLang = getLanguageCode(currentTranslationLanguage);
            const langCode = getBaseLangCode(targetLang);
            setAutoSpeakLang(langCode);

            if (isMobile()) {
              if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
              keepAliveInterval.current = setInterval(() => {
                if (!isAudioPlaying) {
                    console.log('[Audio Keep-Alive] Pinging audio session (8s interval).');
                    playSilentAudio();
                }
                if (audioContextRef.current && audioContextRef.current.state !== 'running') {
                    console.warn('[Audio Keep-Alive] Audio context seems stuck. Attempting to resume.');
                    audioContextRef.current.resume().catch(() => {});
                }
              }, 8000);
            }
          } finally {
            setTtsLoading(false);
          }
        }
      }
    },
    [autoSpeakLang, stopTts, mobileAutoPlayFailed, playBatch]
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
      if (mobileTtsTimeout.current) clearTimeout(mobileTtsTimeout.current);
    };
  }, [autoSpeakLang]);

  return {
    ttsLoading,
    autoSpeakLang,
    setAutoSpeakLang,
    queueForTTS,
    handleMobilePlayToggle,
    spokenSentences, // Pass this down to clear it on lang change
    stopTts,
    // Mobile batch states
    mobileAutoPlayFailed,
    pendingBatchCount,
    playBatch
  };
};
