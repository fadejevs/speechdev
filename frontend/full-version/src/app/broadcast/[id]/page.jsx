"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Switch,
  Button,
  Menu,
  MenuItem
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import apiService from "@/services/apiService";
import SelfieDoodle from "@/images/illustration/SelfieDoodle";
import io from "socket.io-client";
import branding from '@/branding.json';

// ISO‐code ↔ human name
const languageMap = {
  en: "English",    lv: "Latvian",    lt: "Lithuanian", ru: "Russian",
  de: "German",     fr: "French",     es: "Spanish",     it: "Italian",
  zh: "Chinese",    ja: "Japanese",   ko: "Korean",      ar: "Arabic",
  hi: "Hindi",      pt: "Portuguese", nl: "Dutch",       sv: "Swedish",
  fi: "Finnish",    da: "Danish",     no: "Norwegian",   pl: "Polish",
  tr: "Turkish",    cs: "Czech",      hu: "Hungarian",   ro: "Romanian",
  bg: "Bulgarian",  el: "Greek",      he: "Hebrew",      th: "Thai",
  vi: "Vietnamese", id: "Indonesian", ms: "Malay",        uk: "Ukrainian",
  sk: "Slovak",     sl: "Slovenian",  sr: "Serbian",     hr: "Croatian",
  et: "Estonian",
};
const getFullLanguageName = (code = "") => languageMap[code.toLowerCase()] || code;
const getLanguageCode     = (full = "") => {
  const entry = Object.entries(languageMap).find(([, name]) => name === full);
  return entry ? entry[0] : full;
};
const getBaseLangCode = (code) =>
  code ? code.split(/[-_]/)[0].toLowerCase() : code;

const voiceMap = {
  'en': 'en-US-JennyNeural',
  'en-us': 'en-US-JennyNeural',
  'en-gb': 'en-GB-SoniaNeural',
  'fr': 'fr-FR-DeniseNeural',
  'es': 'es-ES-ElviraNeural',
  'de': 'de-DE-KatjaNeural',
  'it': 'it-IT-ElsaNeural',
  'ja': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural',
  'pt': 'pt-PT-RaquelNeural',
  'ru': 'ru-RU-SvetlanaNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',
  'nl': 'nl-NL-ColetteNeural',
  'pl': 'pl-PL-AgnieszkaNeural',
  'lv': 'lv-LV-EveritaNeural',
  'lt': 'lt-LT-OnaNeural',
  'bg': 'bg-BG-KalinaNeural',
  'cs': 'cs-CZ-VlastaNeural',
  'da': 'da-DK-ChristelNeural',
  'el': 'el-GR-AthinaNeural',
  'et': 'et-EE-AnuNeural',
  'fi': 'fi-FI-NooraNeural',
  'hu': 'hu-HU-NoemiNeural',
  'id': 'id-ID-GadisNeural',
  'nb': 'nb-NO-IselinNeural',
  'ro': 'ro-RO-AlinaNeural',
  'sk': 'sk-SK-ViktoriaNeural',
  'sl': 'sl-SI-PetraNeural',
  'sv': 'sv-SE-SofieNeural',
  'tr': 'tr-TR-EmelNeural',
  'uk': 'uk-UA-PolinaNeural'
};

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://speechdev.onrender.com";

const fetchEventById = async (id) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=*`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    }
  );
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
};

// Add Safari detection and audio context handling
const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Add audio context workaround for Safari
const initializeAudioContext = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    
    const audioContext = new AudioContext();
    
    // For mobile, try to resume immediately if possible
    if (audioContext.state === 'suspended' && isMobile()) {
      // Don't resume here, wait for user interaction
      console.log('[Mobile Audio] Audio context created in suspended state - waiting for user interaction');
    }
    
    return audioContext;
  } catch (error) {
    console.warn('[Audio Context] Failed to initialize:', error);
    return null;
  }
};

// Add mobile-specific TTS function using Web Speech API as fallback
const speakWithWebSpeechAPI = (text, lang) => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('[Mobile TTS] Web Speech API not available');
      resolve(false);
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        console.log('[Mobile TTS] Web Speech API synthesis completed');
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.error('[Mobile TTS] Web Speech API error:', event.error);
        resolve(false);
      };

      // Start speaking immediately while we have user gesture
      window.speechSynthesis.speak(utterance);
      console.log('[Mobile TTS] Started Web Speech API synthesis');
      
    } catch (error) {
      console.error('[Mobile TTS] Web Speech API failed:', error);
      resolve(false);
    }
  });
};

// Mobile-optimized TTS function that preserves user gesture
const speakTextMobile = async (text, lang) => {
  console.log('[Mobile TTS] Attempting mobile TTS for:', text.substring(0, 30) + '...');
  
  // Try Web Speech API first for mobile (more reliable)
  if (isMobile()) {
    const webSpeechSuccess = await speakWithWebSpeechAPI(text, lang);
    if (webSpeechSuccess) {
      return true;
    }
    console.log('[Mobile TTS] Web Speech API failed, falling back to Azure');
  }

  // Fallback to Azure TTS with mobile-optimized config
  if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
    console.warn('[Mobile TTS] Azure credentials missing');
    return false;
  }

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
      process.env.NEXT_PUBLIC_AZURE_REGION
    );
    
    const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
    speechConfig.speechSynthesisVoiceName = voice;
    
    // Mobile-specific audio configuration - use default audio output without explicit config
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('[Mobile TTS] Azure synthesis timeout');
        try { synthesizer.close(); } catch (e) {}
        resolve(false);
      }, 10000); // Shorter timeout for mobile

      synthesizer.speakTextAsync(
        text,
        (result) => {
          clearTimeout(timeoutId);
          
          try { synthesizer.close(); } catch (e) {}
          
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('[Mobile TTS] Azure synthesis completed');
            resolve(true);
          } else {
            console.warn('[Mobile TTS] Azure synthesis failed:', result.reason);
            resolve(false);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('[Mobile TTS] Azure synthesis error:', error);
          try { synthesizer.close(); } catch (e) {}
          resolve(false);
        }
      );
    });

  } catch (error) {
    console.error('[Mobile TTS] Azure TTS setup failed:', error);
    return false;
  }
};

export default function BroadcastPage() {
  const { id } = useParams();

  // ── 1) Load event & init langs ─────────────────────────────────────────────
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  const [availableSourceLanguages, setAvailableSourceLanguages] = useState([]);
  const [availableTargetLanguages, setAvailableTargetLanguages] = useState([]);

  const [transcriptionLanguage, setTranscriptionLanguage] = useState("");
  const [translationLanguage, setTranslationLanguage]     = useState("");

  const [transcriptionMenuAnchor, setTranscriptionMenuAnchor] = useState(null);
  const [translationMenuAnchor, setTranslationMenuAnchor]     = useState(null);

  // ── State: live transcript, translations, history ──────────────────────────
  const [persistedCaptions, setPersistedCaptions] = useState([]);
  const [persistedTranslations, setPersistedTranslations] = useState([]); // Accumulated translations
  const [currentInterimCaption, setCurrentInterimCaption] = useState("");
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState("");
  const [liveTranslations, setLiveTranslations] = useState({}); // For final translations (triggers TTS)
  const [realtimeTranslations, setRealtimeTranslations] = useState({}); // For interim translations (display only)
  const [history, setHistory]                     = useState([]);

  // 1. Add state for auto-TTS language
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);

  // Add a ref for the socket
  const socketRef = useRef(null);

  // State for TTS with Safari/iOS workarounds
  const ttsQueue = useRef([]);
  const currentSynthesizerRef = useRef(null);
  const spokenSentences = useRef(new Set()); // Track spoken sentences to avoid duplicates
  const audioContextRef = useRef(null);
  const ttsErrorCount = useRef(0); // Track consecutive TTS errors
  const maxTtsErrors = 3; // Maximum errors before fallback

  // Add refs for stabilization timer
  const batchTimer = useRef(null);
  const lastFinalTranscriptionTime = useRef(0);
  const lastProcessedTranslation = useRef('');
  const stabilizationTimer = useRef(null);

  // Add fallback for when TTS fails completely
  const [ttsError, setTtsError] = useState(null);
  const [showTtsWarning, setShowTtsWarning] = useState(false);

  // Initialize audio context on component mount for Safari
  useEffect(() => {
    if (isSafari() || isIOS()) {
      audioContextRef.current = initializeAudioContext();
    }
    
    // Cleanup audio context on unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn('[Audio Context] Cleanup failed:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEventById(id)
      .then(ev => {
        if (ev) {
          setEventData(ev);

          if (ev.sourceLanguages?.length) {
            setAvailableSourceLanguages(ev.sourceLanguages);
            setTranscriptionLanguage(ev.sourceLanguages[0]);
            setLiveTranscriptionLang(ev.sourceLanguages[0]);
          }

          if (ev.targetLanguages?.length) {
            setAvailableTargetLanguages(ev.targetLanguages);
            setTranslationLanguage(ev.targetLanguages[0]);
          }

          if (ev.status === "Paused" || ev.status === "Completed") {
            // stopListening();
          } else {
            // startListening();
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setEventData(null);
        setLoading(false);
      });
  }, [id]);

  // Add this function for translation (using your API or Azure)
  const fetchTranslations = async (text, langOverride) => {
    const out = {};
    const raw = getLanguageCode(langOverride);
    if (!raw) {
      console.warn("No target language set, skipping fallback");
      return out;
    }
    const toCode = raw.split(/[-_]/)[0].toLowerCase();
    try {
      // Add debugging logs
      console.log("[Translation Debug] API Key length:", process.env.NEXT_PUBLIC_DEEPL_AUTH_KEY?.length || 0);
      console.log("[Translation Debug] API Key starts with:", process.env.NEXT_PUBLIC_DEEPL_AUTH_KEY?.substring(0, 4));
      
      const res = await fetch("/api/translate", {
        method: "POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ 
          text: text,
          target_lang: toCode.toUpperCase()
        }),
      });
      
      // Add more debugging
      if (!res.ok) {
        const err = await res.text();
        console.error("[Translation Debug] Error details:", {
          status: res.status,
          statusText: res.statusText,
          error: err
        });
        return out;
      }
      const { translation } = await res.json();
      out[toCode] = translation;
    } catch (e) {
      console.error("[Translation Debug] Full error:", e);
    }
    return out;
  };

  // Enhanced speakText function with Safari/iOS workarounds
  const speakText = useCallback((text, lang, onDone) => {
    // Basic validation
    if (!text || !process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      if (onDone) onDone(false);
      return;
    }

    // Safari/iOS specific workarounds
    const safariMode = isSafari() || isIOS();
    
    const performSynthesis = async () => {
      if (safariMode) {
        // Ensure audio context is active for Safari before each synthesis
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
            console.log('[TTS Safari] Audio context resumed for synthesis');
          } catch (error) {
            console.warn('[TTS Safari] Failed to resume audio context:', error);
          }
        }
        
        // Add small delay for Safari to prevent rapid-fire issues
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        // Configure and create the synthesizer with Safari optimizations
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
          process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
          process.env.NEXT_PUBLIC_AZURE_REGION
        );
        
        const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
        speechConfig.speechSynthesisVoiceName = voice;
        
        // Safari-specific audio config
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
        
        // Store the synthesizer instance so we can clean up if needed
        currentSynthesizerRef.current = synthesizer;

        console.log(`[TTS] Starting synthesis for: "${text.substring(0, 30)}..." (Safari mode: ${safariMode})`);

        // Create synthesis promise with timeout
        const synthesisPromise = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            console.warn('[TTS] Synthesis timeout, cleaning up...');
            try { synthesizer.close(); } catch (e) { /* Ignore */ }
            currentSynthesizerRef.current = null;
            reject(new Error('Synthesis timeout'));
          }, 30000); // 30 second timeout for Safari

          synthesizer.speakTextAsync(
            text,
            (result) => {
              clearTimeout(timeoutId);
              
              const cleanup = () => {
                try { 
                  synthesizer.close(); 
                } catch (e) { 
                  console.warn('[TTS] Synthesizer cleanup error:', e);
                }
                currentSynthesizerRef.current = null;
              };

              if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                // Reset error count on success
                ttsErrorCount.current = 0;
                
                const audioDurationMs = result.audioDuration / 10000;
                console.log(`[TTS] Synthesis complete. Audio duration: ${audioDurationMs.toFixed(0)}ms`);
                
                // For Safari/iOS, use a shorter wait time to prevent hanging
                const waitTime = safariMode ? Math.min(audioDurationMs, 3000) : audioDurationMs;
                
                setTimeout(() => {
                  console.log(`[TTS] Playback finished for: "${text.substring(0, 30)}..."`);
                  cleanup();
                  resolve(true);
                }, waitTime);

              } else {
                console.warn(`[TTS] Synthesis failed or canceled. Reason: ${result.reason}`);
                cleanup();
                resolve(false);
              }
            },
            (error) => {
              clearTimeout(timeoutId);
              console.error(`[TTS] Error during synthesis: ${error}`);
              
              // Increment error count
              ttsErrorCount.current++;
              
              try { 
                synthesizer.close(); 
              } catch (e) { 
                console.warn('[TTS] Error cleanup failed:', e);
              }
              currentSynthesizerRef.current = null;
              
              reject(error);
            }
          );
        });

        const success = await synthesisPromise;
        if (onDone) onDone(success);

      } catch (error) {
        console.error(`[TTS] Critical error: ${error.message}`);
        ttsErrorCount.current++;
        
        // If too many errors, temporarily disable TTS
        if (ttsErrorCount.current >= maxTtsErrors) {
          console.warn(`[TTS] Too many errors (${ttsErrorCount.current}), temporarily disabling TTS`);
          setTimeout(() => {
            ttsErrorCount.current = 0;
            console.log('[TTS] TTS re-enabled after cooldown');
          }, 10000); // 10 second cooldown
        }
        
        if (onDone) onDone(false);
      }
    };

    // Execute the synthesis
    performSynthesis();
  }, []);

  // Enhanced queue processor with Safari error handling
  const processQueue = useCallback(() => {
    if (currentSynthesizerRef.current || ttsQueue.current.length === 0) {
      return; // Exit if already speaking or nothing to speak
    }

    // Skip processing if too many errors occurred
    if (ttsErrorCount.current >= maxTtsErrors) {
      console.warn('[TTS] Skipping queue processing due to too many errors');
      return;
    }

    const item = ttsQueue.current.shift();
    
    console.log(`[TTS Queue] Processing item: "${item.text.substring(0, 30)}..." (${ttsQueue.current.length} remaining)`);
    
    speakText(item.text, item.lang, (success) => {
      console.log(`[TTS Queue] Item completed with success: ${success}`);
      
      // For Safari/iOS, add a longer pause and ensure audio context stays active
      const pauseTime = (isSafari() || isIOS()) ? 800 : 250;
      
      setTimeout(() => {
        // Double-check queue isn't stuck
        if (ttsQueue.current.length > 0 && !currentSynthesizerRef.current) {
          console.log(`[TTS Queue] Continuing with ${ttsQueue.current.length} items remaining`);
          processQueue(); // Process next item
        }
      }, pauseTime);
    });
  }, [speakText]);

  // Add queue watchdog to restart stuck queues
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      // If there are items in queue but nothing is speaking, restart the queue
      if (ttsQueue.current.length > 0 && !currentSynthesizerRef.current && autoSpeakLang) {
        console.log('[TTS Watchdog] Restarting stuck queue with', ttsQueue.current.length, 'items');
        processQueue();
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(watchdogInterval);
  }, [processQueue, autoSpeakLang]);

  // TTS effect with enhanced error handling
  useEffect(() => {
    // Skip this effect for mobile - mobile uses immediate TTS
    if (isMobile()) return;
    
    if (!autoSpeakLang || !liveTranslations[autoSpeakLang]) return;

    const text = liveTranslations[autoSpeakLang].trim();
    if (!text || text.length < 10) return; // Skip very short texts
    
    console.log(`[TTS Effect] New translation: "${text}" for language: ${autoSpeakLang}`);
    
    // Check if TTS is disabled due to too many errors
    if (ttsErrorCount.current >= maxTtsErrors) {
      if (!showTtsWarning) {
        setShowTtsWarning(true);
        setTtsError(`TTS temporarily disabled due to browser compatibility issues. Try refreshing the page or using a different browser.`);
        
        // Auto-hide warning after 10 seconds
        setTimeout(() => {
          setShowTtsWarning(false);
          setTtsError(null);
        }, 10000);
      }
      return;
    }
    
    // Simple duplicate check using exact matches
    if (spokenSentences.current.has(text)) {
      console.log(`[TTS] Skipping duplicate: "${text}"`);
      return;
    }

    // Queue the sentence and mark it as spoken
    console.log(`[TTS] Queueing new sentence: "${text}" (Queue length: ${ttsQueue.current.length})`);
    ttsQueue.current.push({ text, lang: autoSpeakLang });
    spokenSentences.current.add(text);
    
    // Use try-catch for queue processing
    try {
      processQueue();
    } catch (error) {
      console.error('[TTS] Error starting queue processing:', error);
      setTtsError('TTS failed to start. Please try again.');
      setTimeout(() => setTtsError(null), 5000);
    }

  }, [liveTranslations, autoSpeakLang, processQueue]);

  // Clear spoken sentences when auto-speak language changes
  useEffect(() => {
    spokenSentences.current.clear();
    ttsQueue.current = [];
    if (currentSynthesizerRef.current) {
      try { currentSynthesizerRef.current.close(); } catch(e) {}
      currentSynthesizerRef.current = null;
    }
    setTtsError(null);
    setShowTtsWarning(false);
  }, [autoSpeakLang]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (currentSynthesizerRef.current) {
        try { currentSynthesizerRef.current.close(); } catch(e) {}
        currentSynthesizerRef.current = null;
      }
      ttsQueue.current = [];
      spokenSentences.current.clear();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn('[Audio Context] Cleanup failed:', e);
        }
      }
    };
  }, []);

  // Clear persisted translations when translation language changes
  useEffect(() => {
    setPersistedTranslations([]);
  }, [translationLanguage]);

  // Effect for socket connection and transcription handling
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Broadcast] Socket connected, joining room:", id);
      setSocketConnected(true);
      socket.emit("join_room", { room: id });
    });

    socket.on("disconnect", () => {
      console.log("[Broadcast] Socket disconnected.");
      setSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Broadcast] Socket connection error:", err.message);
      setSocketConnected(false);
    });

    socket.on("realtime_transcription", (data) => {
      console.log("[Transcription] Received:", { 
        text: data.text, 
        is_final: data.is_final, 
        source_language: data.source_language 
      });
      
      setLiveTranscriptionLang(data.source_language || "");

      if (data.is_final) {
        // Clear interim caption FIRST to prevent duplication
        setCurrentInterimCaption("");
        
        // Prevent rapid-fire final transcriptions (likely duplicates from speech service)
        const now = Date.now();
        if (now - lastFinalTranscriptionTime.current < 500) { // Less than 500ms apart
          console.log("[Transcription] Skipping rapid-fire final transcription:", data.text);
          return;
        }
        lastFinalTranscriptionTime.current = now;
        
        if (data.text && data.text.trim() !== "") {
          const newCaption = { 
            id: Date.now() + Math.random(), 
            text: data.text.trim(), 
            timestamp: Date.now() 
          };
          
          setPersistedCaptions(prevCaptions => {
            // Check if this text already exists in recent captions to prevent duplicates
            const isDuplicate = prevCaptions.some(caption => {
              const timeDiff = Date.now() - caption.timestamp;
              if (timeDiff > 5000) return false; // Only check recent captions
              
              // Exact match
              if (caption.text === newCaption.text) return true;
              
              // Similarity check for speech recognition variations
              const captionWords = caption.text.toLowerCase().split(/\s+/);
              const newWords = newCaption.text.toLowerCase().split(/\s+/);
              
              // If texts are very similar in length and content
              if (Math.abs(captionWords.length - newWords.length) <= 2) {
                const commonWords = captionWords.filter(word => newWords.includes(word));
                const similarity = commonWords.length / Math.max(captionWords.length, newWords.length);
                if (similarity > 0.8) return true; // 80% similarity threshold
              }
              
              // Check if one text contains most of the other (substring variants)
              const shorterText = caption.text.length < newCaption.text.length ? caption.text : newCaption.text;
              const longerText = caption.text.length >= newCaption.text.length ? caption.text : newCaption.text;
              if (longerText.toLowerCase().includes(shorterText.toLowerCase()) && shorterText.length > 10) {
                return true;
              }
              
              return false;
            });
            
            if (isDuplicate) {
              console.log("[Transcription] Skipping similar/duplicate caption:", newCaption.text);
              return prevCaptions;
            }
            
            console.log("[Transcription] Adding final caption:", newCaption.text);
            return [...prevCaptions, newCaption];
          });
        }
        
        // Trigger translation for final text. This is the new, direct TTS logic.
        if (data.text && data.text.trim() && translationLanguage) {
          fetchTranslations(data.text.trim(), translationLanguage).then((translations) => {
            const targetLang = getLanguageCode(translationLanguage);
            const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
            const translatedText = translations[langCode];

            if (translatedText && translatedText.trim()) {
              // Queue for TTS if enabled
              if (autoSpeakLang === langCode) {
                const textToSpeak = translatedText.trim();
                
                // MOBILE OPTIMIZATION: Use immediate TTS for mobile
                if (isMobile()) {
                  // Simple duplicate check for mobile
                  if (!spokenSentences.current.has(textToSpeak)) {
                    spokenSentences.current.add(textToSpeak);
                    console.log(`[Mobile TTS] Speaking new translation immediately: "${textToSpeak}"`);
                    
                    // Speak immediately without queue delays
                    speakTextMobile(textToSpeak, langCode).then((success) => {
                      if (!success) {
                        console.warn('[Mobile TTS] Failed to speak new translation');
                      }
                    }).catch((error) => {
                      console.error('[Mobile TTS] Error speaking new translation:', error);
                    });
                  } else {
                    console.log(`[Mobile TTS] Skipping duplicate: "${textToSpeak}"`);
                  }
                } else {
                  // DESKTOP: Use original queue system
                  // A simple check to avoid queueing the exact same sentence if the service sends it twice.
                  if (!spokenSentences.current.has(textToSpeak)) {
                    ttsQueue.current.push({ text: textToSpeak, lang: langCode });
                    spokenSentences.current.add(textToSpeak); // Remember sentence
                    console.log(`[TTS] Queuing final sentence: "${textToSpeak}"`);
                    processQueue();
                  } else {
                    console.log(`[TTS] Skipping duplicate: "${textToSpeak}"`);
                  }
                }
              }

              // Update display states
              setLiveTranslations(translations); // For potential use elsewhere, but not for triggering TTS
              setRealtimeTranslations({}); // Clear interim display translation

              // Add to persisted translations for display
              const newTranslation = {
                id: Date.now() + Math.random(),
                text: translatedText.trim(),
                language: targetLang,
                timestamp: Date.now()
              };

              setPersistedTranslations(prev => {
                // Avoid displaying the exact same line twice in a row
                if (prev.length > 0 && prev[prev.length - 1].text === newTranslation.text) {
                  return prev;
                }
                return [...prev, newTranslation];
              });
            }
          });
        }
      } else {
        // Handle interim transcriptions - ONLY update display, never trigger TTS
        console.log("[Transcription] Setting interim caption:", data.text);
        setCurrentInterimCaption(data.text || "");
        
        // Update display only for interim translations, no TTS
        if (data.text && data.text.trim() && translationLanguage) {
          fetchTranslations(data.text, translationLanguage).then((translations) => {
            setRealtimeTranslations(translations); // Only update display, no TTS
          });
        }
      }
    });

    

    socket.on("event_status_update", (data) => {
      if (data.room_id === id && ["Paused", "Completed", "Live"].includes(data.status)) {
        console.log("[Broadcast] Event status update received:", data);
        setEventData((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_room", { room: id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, translationLanguage, processQueue, autoSpeakLang]);

  // Effect for cleaning up old captions from view
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPersistedCaptions(prevCaptions => {
        const now = Date.now();
        const filtered = prevCaptions.filter(caption => (now - caption.timestamp) < 30000);
        return filtered.length === prevCaptions.length ? prevCaptions : filtered;
      });
      
      // Also clean up old translations
      setPersistedTranslations(prevTranslations => {
        const now = Date.now();
        const filtered = prevTranslations.filter(translation => (now - translation.timestamp) < 30000);
        return filtered.length === prevTranslations.length ? prevTranslations : filtered;
      });
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Derived state for the complete displayed caption
  const displayedCaption = useMemo(() => {
    const finalTexts = persistedCaptions.map(c => c.text).join(' ');
    let fullCaption = finalTexts;
    
    if (currentInterimCaption) {
      const interimTrimmed = currentInterimCaption.trim();
      
      if (interimTrimmed) {
        // Check if the interim caption is already contained in the final texts
        const isAlreadyIncluded = finalTexts.includes(interimTrimmed);
        
        // Also check if the final text ends with the interim text (partial overlap)
        const hasPartialOverlap = finalTexts.endsWith(interimTrimmed);
        
        // Check if interim is very similar to the end of final text (speech recognition variations)
        const finalWords = finalTexts.toLowerCase().split(' ').slice(-5); // Last 5 words
        const interimWords = interimTrimmed.toLowerCase().split(' ');
        const hasSimilarEnding = interimWords.length > 0 && 
          finalWords.some(word => interimWords.includes(word)) &&
          interimWords.length <= 3; // Only for short interim captions
        
        // Only add interim caption if it doesn't duplicate existing content
        if (!isAlreadyIncluded && !hasPartialOverlap && !hasSimilarEnding) {
          fullCaption = finalTexts ? `${finalTexts} ${interimTrimmed}` : interimTrimmed;
        }
      }
    }
    
    return fullCaption.trim();
  }, [persistedCaptions, currentInterimCaption]);

  // Derived state for the complete displayed translation
  const displayedTranslation = useMemo(() => {
    const finalTranslations = persistedTranslations.map(t => t.text).join(' ');
    let fullTranslation = finalTranslations;
    
    // Add interim translation if available
    if (translationLanguage && realtimeTranslations) {
      const targetLang = getLanguageCode(translationLanguage);
      const currentInterimTranslation = realtimeTranslations[targetLang.split(/[-_]/)[0].toLowerCase()];
      
      if (currentInterimTranslation && currentInterimTranslation.trim()) {
        const interimTrimmed = currentInterimTranslation.trim();
        
        // Only add if it's not already included in final translations
        if (!finalTranslations.includes(interimTrimmed)) {
          fullTranslation = finalTranslations ? `${finalTranslations} ${interimTrimmed}` : interimTrimmed;
        }
      }
    }
    
    return fullTranslation.trim();
  }, [persistedTranslations, realtimeTranslations, translationLanguage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!eventData) {
    return (
      <Box sx={{ p:4, textAlign:"center" }}>
        <Typography variant="h5">Event not found</Typography>
        <Typography>The event you're looking for doesn't exist.</Typography>
      </Box>
    );
  }

  if (
    eventData &&
    (eventData.status === "Paused" ||
     eventData.status === "Completed" ||
     eventData.status === "Scheduled")
  ) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <Box component="header" sx={{
          display: "flex", alignItems: "center", height: 64,
          px: 2, borderBottom: "1px solid #f0f0f0",
          backgroundColor: "background.default"
        }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
            <img
              src={branding.logo.main}
              alt="interpretd logo"
              style={{ height: 40, display: "block" }}
            />
          </Link>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, maxWidth: "1200px", width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }}>
          {/* Event Header */}
          <Box sx={{
            mb: 3, p: { xs: 2, sm: 3 }, borderRadius: 2,
            bgcolor: "white", boxShadow: "0px 1px 2px rgba(0,0,0,0.06)",
            border: "1px solid #F2F3F5"
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36", mb: 1 }}>
              {eventData.title}
            </Typography>
            <Typography variant="body2" sx={{ color: "#637381" }}>
              {eventData.description}
            </Typography>
          </Box>

          {/* Paused/Not Started Message */}
          <Box sx={{
            bgcolor: "white",
            border: "1px solid #F2F3F5",
            borderRadius: 2,
            minHeight: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 6,
          }}>
            {/* Illustration (replace with your SVG or image if you want) */}
            <Box sx={{ width: 180, height: 180, objectFit: "contain" }}>
            <SelfieDoodle
              sx={{
                width: "100%",
                height: "100%",
                fontSize: 0,
              }}
            />
            </Box>
            <Typography variant="h6" sx={{ mb: 1, textAlign: "center" }}>
              The event hasn't started yet or has been paused. It will resume shortly.
            </Typography>
            <Typography variant="body2" sx={{ color: "#888", textAlign: "center" }}>
              If you have any questions, feel free to reach out to the event organiser.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>
      {/* Header */}
      <Box component="header" sx={{
        display:"flex", alignItems:"center", height:64,
        px:2, borderBottom:"1px solid #f0f0f0",
        backgroundColor:"background.default"
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
          <img
            src={branding.logo.main}
            alt="interpretd logo"
            style={{ height: 40, display: "block" }}
          />
        </Link>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex:1, maxWidth:"1200px", width:"100%", mx:"auto", p:{ xs:1.5, sm:2, md:3 } }}>
        {/* Event Header */}
        <Box sx={{
          mb:{ xs:2, sm:3 }, 
          p:{ xs:2, sm:3 }, 
          borderRadius:2,
          bgcolor:"white", 
          boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5"
        }}>
          <Typography variant="h6" sx={{ fontWeight:600, color:"#212B36", mb:1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {eventData.title}
          </Typography>
          <Typography variant="body2" sx={{ color:"#637381", fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
            {eventData.description}
          </Typography>
        </Box>

        {/* Live Transcription */}
        <Box sx={{
          mb:{ xs:2, sm:3 }, 
          borderRadius:2, 
          bgcolor:"white",
          boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5", 
          overflow:"hidden"
        }}>
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 0 },
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderBottom: "1px solid #F2F3F5",
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36", fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              Live Transcription
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: '100%', sm: 'auto' } }}>
              <Box sx={{
                bgcolor: "#EEF2FF",
                color: "#6366F1",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: { xs: "13px", sm: "14px" },
                fontWeight: 500,
                flex: { xs: 1, sm: 'none' }
              }}>
                {transcriptionLanguage
                  ? getFullLanguageName(getBaseLangCode(transcriptionLanguage))
                  : <span style={{ color: "#ccc" }}>[No language]</span>}
              </Box>
            </Box>
          </Box>
          <Box sx={{ px:{ xs:1.5, sm:3 }, py:{ xs:2, sm:3 }, minHeight:"200px" }}>
            <Paper elevation={0} sx={{
              p:{ xs:2, sm:3 }, 
              minHeight:"150px", 
              maxHeight:{ xs:"250px", sm:"300px" },
              overflowY:"auto",
              borderRadius:"0 0 8px 8px"
            }}>
              <Box sx={{ p:0 }}>
                {!socketConnected ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body1" sx={{ color: "text.secondary", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Waiting for connection...
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ 
                    color: displayedCaption ? "text.primary" : "text.secondary",
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    lineHeight: { xs: 1.5, sm: 1.75 }
                  }}>
                    {displayedCaption || "Waiting for live transcription..."}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Live Translation */}
        <Box sx={{
          mb:{ xs:2, sm:3 }, 
          borderRadius:2, 
          bgcolor:"white",
          boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5", 
          overflow:"hidden"
        }}>
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 0 },
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderBottom: "1px solid #F2F3F5",
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36", fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              Live Translation
            </Typography>

            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              width: { xs: '100%', sm: 'auto' },
              flexWrap: { xs: 'wrap', sm: 'nowrap' }
            }}>
              <Box sx={{
                bgcolor: "#EEF2FF",
                color: "#6366F1",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: { xs: "13px", sm: "14px" },
                fontWeight: 500,
                flex: { xs: 1, sm: 'none' }
              }}>
                {translationLanguage
                  ? getFullLanguageName(getBaseLangCode(translationLanguage))
                  : <span style={{ color: "#ccc" }}>[No language]</span>}
              </Box>
              <Button
                size="small"
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setTranslationMenuAnchor(e.currentTarget)}
                sx={{
                  textTransform: "none",
                  fontSize: { xs: "13px", sm: "14px" },
                  color: "#6366F1",
                  minWidth: { xs: '120px', sm: 'auto' }
                }}
              >
                Change Language
              </Button>
              <Menu
                anchorEl={translationMenuAnchor}
                open={Boolean(translationMenuAnchor)}
                onClose={() => setTranslationMenuAnchor(null)}
              >
                {availableTargetLanguages.map((lang) => (
                  <MenuItem
                    key={lang}
                    onClick={() => {
                      setTranslationLanguage(lang);
                      setTranslationMenuAnchor(null);
                    }}
                  >
                    {getFullLanguageName(getBaseLangCode(lang))}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>
          <Box sx={{ px:{ xs:1.5, sm:3 }, py:{ xs:2, sm:3 }, minHeight:"200px" }}>
            <Paper elevation={0} sx={{
              p:{ xs:2, sm:3 }, 
              minHeight:"150px", 
              maxHeight:{ xs:"250px", sm:"300px" },
              overflowY:"auto",
              borderRadius:"0 0 8px 8px"
            }}>
              <Box sx={{ p:0 }}>
                {availableTargetLanguages.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {/* TTS Error Notification */}
                    {ttsError && (
                      <Box sx={{ 
                        mb: 2, 
                        p: 1.5, 
                        bgcolor: "#fff3cd", 
                        border: "1px solid #ffeaa7", 
                        borderRadius: 1,
                        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                        color: "#856404"
                      }}>
                        ⚠️ {ttsError}
                      </Box>
                    )}
                    
                    {autoSpeakLang && (
                      <Button
                        onClick={() => setAutoSpeakLang(null)}
                        color="secondary"
                        size="small"
                        sx={{ 
                          mb: 2, 
                          alignSelf: "flex-start",
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' }
                        }}
                      >
                        Stop Auto-TTS
                      </Button>
                    )}
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: { xs: "flex-start", sm: "center" }, 
                      gap: 2,
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ 
                          color: displayedTranslation ? "text.primary" : "text.secondary",
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          lineHeight: { xs: 1.5, sm: 1.75 }
                        }}>
                          {displayedTranslation || "Waiting for live translation..."}
                        </Typography>
                      </Box>
                      {translationLanguage && displayedTranslation && (
                        <Button
                          onClick={async () => {
                            const targetLang = getLanguageCode(translationLanguage);
                            const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
                            
                            // MOBILE OPTIMIZATION: Handle TTS immediately during user gesture
                            if (isMobile()) {
                              console.log('[Mobile TTS] Button clicked - immediate mobile TTS');
                              
                              // Activate audio context immediately during user interaction
                              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                                try {
                                  await audioContextRef.current.resume();
                                  console.log('[Mobile TTS] Audio context activated during user click');
                                } catch (error) {
                                  console.warn('[Mobile TTS] Failed to activate audio context:', error);
                                }
                              }
                              
                              // If clicking the same language, speak current text immediately
                              if (autoSpeakLang === langCode) {
                                if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                  console.log('[Mobile TTS] Speaking current translation immediately');
                                  const success = await speakTextMobile(displayedTranslation.trim(), langCode);
                                  if (!success) {
                                    setTtsError('Mobile TTS failed. Try again or use a different browser.');
                                    setTimeout(() => setTtsError(null), 5000);
                                  }
                                }
                                return; // Don't toggle off, just speak
                              }
                              
                              // Enable auto-speak for mobile
                              setAutoSpeakLang(langCode);
                              
                              // Speak current text immediately if available
                              if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                console.log('[Mobile TTS] Speaking initial translation immediately');
                                const success = await speakTextMobile(displayedTranslation.trim(), langCode);
                                if (!success) {
                                  setTtsError('Mobile TTS failed. Try again or use a different browser.');
                                  setTimeout(() => setTtsError(null), 5000);
                                }
                              }
                              
                              return;
                            }
                            
                            // DESKTOP HANDLING (Original logic)
                            // If clicking the same language, force restart TTS queue
                            if (autoSpeakLang === langCode) {
                              console.log('[TTS] Force restarting TTS queue');
                              
                              // Clear current queue and reset state
                              ttsQueue.current = [];
                              if (currentSynthesizerRef.current) {
                                try { currentSynthesizerRef.current.close(); } catch(e) {}
                                currentSynthesizerRef.current = null;
                              }
                              
                              // Reset error count
                              ttsErrorCount.current = 0;
                              setTtsError(null);
                              
                              // Restart with current translation
                              if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                console.log('[TTS] Restarting with current translation');
                                ttsQueue.current.push({ text: displayedTranslation.trim(), lang: langCode });
                                setTimeout(() => processQueue(), 100);
                              }
                              
                              return; // Don't toggle off
                            }
                            
                            // Safari/iOS specific user interaction handling for desktop
                            if (isSafari() || isIOS()) {
                              // Ensure audio context is activated by user interaction
                              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                                try {
                                  await audioContextRef.current.resume();
                                  console.log('[TTS Safari] Audio context activated by user interaction');
                                } catch (error) {
                                  console.warn('[TTS Safari] Failed to activate audio context:', error);
                                }
                              }
                              
                              // Add a small delay for Safari
                              await new Promise(resolve => setTimeout(resolve, 50));
                            }
                            
                            setAutoSpeakLang(autoSpeakLang === langCode ? null : langCode);
                          }}
                          sx={{ 
                            minWidth: { xs: '100%', sm: 0 },
                            justifyContent: { xs: 'center', sm: 'flex-start' }
                          }}
                          aria-label={`Auto-play TTS for ${getFullLanguageName(getBaseLangCode(translationLanguage))}`}
                          title={autoSpeakLang === getLanguageCode(translationLanguage).split(/[-_]/)[0].toLowerCase() 
                            ? "Click again to restart TTS or click once to stop"
                            : "Click to enable auto-speech"}
                        >
                          <VolumeUpIcon color={
                            autoSpeakLang === getLanguageCode(translationLanguage).split(/[-_]/)[0].toLowerCase() 
                              ? "primary" 
                              : "inherit"
                            } />
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Typography sx={{ 
                    color:"#637381", 
                    fontStyle:"italic",
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}>
                    No target languages configured for this event.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}