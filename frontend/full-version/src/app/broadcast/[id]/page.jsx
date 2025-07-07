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
  MenuItem,
  IconButton,
  useMediaQuery,
  useTheme,
  Fab
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MenuIcon from "@mui/icons-material/Menu";
import PauseIcon from "@mui/icons-material/Pause";
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

// Placeholder text for each language
const placeholderText = {
  en: "Waiting for live translation...",
  lv: "Gaida tiešraides tulkojumu...",
  lt: "Laukiama tiesioginės transliacijos...",
  ru: "Ожидание прямого перевода...",
  de: "Warten auf Live-Übersetzung...",
  fr: "En attente de traduction en direct...",
  es: "Esperando traducción en vivo...",
  it: "In attesa di traduzione dal vivo...",
  zh: "等待实时翻译...",
  ja: "ライブ翻訳を待っています...",
  ko: "실시간 번역을 기다리는 중...",
  ar: "في انتظار الترجمة المباشرة...",
  hi: "लाइव अनुवाद की प्रतीक्षा में...",
  pt: "Aguardando tradução ao vivo...",
  nl: "Wachten op live vertaling...",
  sv: "Väntar på direktöversättning...",
  fi: "Odotetaan reaaliaikaista käännöstä...",
  da: "Venter på direkte oversættelse...",
  no: "Venter på direkteoversettelse...",
  pl: "Oczekiwanie na tłumaczenie na żywo...",
  tr: "Canlı çeviri bekleniyor...",
  cs: "Čekání na živý překlad...",
  hu: "Várakozás az élő fordításra...",
  ro: "Se așteaptă traducerea în direct...",
  bg: "Изчакване на превод на живо...",
  el: "Αναμονή για ζωντανή μετάφραση...",
  he: "ממתין לתרגום חי...",
  th: "รอการแปลสด...",
  vi: "Đang chờ bản dịch trực tiếp...",
  id: "Menunggu terjemahan langsung...",
  ms: "Menunggu terjemahan langsung...",
  uk: "Очікування прямого перекладу...",
  sk: "Čaká sa na živý preklad...",
  sl: "Čakanje na živ prevod...",
  sr: "Čekanje na uživo prevod...",
  hr: "Čekanje na uživo prijevod...",
  et: "Ootame reaalajas tõlget..."
};

const getPlaceholderText = (translationLanguage) => {
  if (!translationLanguage) return placeholderText.en; // Default to English
  const langCode = getBaseLangCode(getLanguageCode(translationLanguage));
  return placeholderText[langCode] || placeholderText.en; // Fallback to English
};

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

// Enhanced device detection with better tablet support
const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isAndroidTablet = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
};

const isTablet = () => {
  if (typeof navigator === 'undefined') return false;
  return isIOS() || isAndroidTablet() || 
         /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Kindle|Silk/i.test(navigator.userAgent);
};

const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         isTablet(); // Include tablets in mobile category for TTS handling
};

// Enhanced audio context initialization with better error handling
const initializeAudioContext = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    
    const audioContext = new AudioContext();
    
    // Log initial state for debugging
    console.log('[Audio Context] Created with state:', audioContext.state);
    
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
      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();
      
      // Wait a bit for the cancellation to complete
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : lang;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          console.log('[Mobile TTS] ✅ Web Speech API started successfully');
        };

        utterance.onend = () => {
          console.log('[Mobile TTS] ✅ Web Speech API synthesis completed');
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error('[Mobile TTS] ❌ Web Speech API error:', {
            error: event.error,
            message: event.message,
            userAgent: navigator.userAgent
          });
          resolve(false);
        };

        // Check if voices are available
        const voices = window.speechSynthesis.getVoices();
        console.log('[Mobile TTS] Available voices:', voices.length, voices.map(v => `${v.name} (${v.lang})`));
        
        // Start speaking
        window.speechSynthesis.speak(utterance);
        console.log('[Mobile TTS] Started Web Speech API synthesis for:', text.substring(0, 30) + '...');
        
        // Fallback timeout in case Web Speech API hangs
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('[Mobile TTS] Web Speech API is still active after 15s');
          } else {
            console.warn('[Mobile TTS] Web Speech API may have failed silently');
            resolve(false);
          }
        }, 15000);
        
      }, 100); // Small delay to ensure cancellation completes
      
    } catch (error) {
      console.error('[Mobile TTS] ❌ Web Speech API setup failed:', error);
      resolve(false);
    }
  });
};

// Mobile-optimized TTS function that handles interruptions properly
const speakTextMobile = async (text, lang) => {
  console.log('[Mobile TTS] Attempting mobile TTS for:', text.substring(0, 30) + '...');
  
  // Simple overlap prevention for mobile
  if (window.mobileTtsLock) {
    console.log('[Mobile TTS] ⚠️ Already locked, preventing overlap');
    return false;
  }
  
  // Set mobile lock
  window.mobileTtsLock = true;
  
  try {
    // Check if we're already speaking and handle interruption
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      console.log('[Mobile TTS] 🔄 Interrupting current speech for new text');
      window.speechSynthesis.cancel();
      // Wait for cancellation to complete
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Try Web Speech API first for mobile (more reliable)
    if (isMobile()) {
      console.log('[Mobile TTS] 🎯 Trying Web Speech API first...');
      const webSpeechSuccess = await speakWithWebSpeechAPI(text, lang);
      if (webSpeechSuccess) {
        console.log('[Mobile TTS] ✅ Web Speech API succeeded');
        return true;
      }
      console.log('[Mobile TTS] 🔄 Web Speech API failed, falling back to Azure TTS');
    }

    // Fallback to Azure TTS with mobile-optimized config
    if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      console.warn('[Mobile TTS] ❌ Azure credentials missing');
      return false;
    }

    try {
      console.log('[Mobile TTS] 🔄 Starting Azure TTS fallback...');
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
        process.env.NEXT_PUBLIC_AZURE_REGION
      );
      
      const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
      speechConfig.speechSynthesisVoiceName = voice;
      console.log('[Mobile TTS] 🎵 Using Azure voice:', voice);
      
      // Mobile-specific audio configuration - use default audio output without explicit config
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('[Mobile TTS] ⏰ Azure synthesis timeout after 10s');
          try { synthesizer.close(); } catch (e) {}
          resolve(false);
        }, 10000); // Shorter timeout for mobile

        synthesizer.speakTextAsync(
          text,
          (result) => {
            clearTimeout(timeoutId);
            
            try { synthesizer.close(); } catch (e) {}
            
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('[Mobile TTS] ✅ Azure TTS synthesis completed');
              resolve(true);
            } else {
              console.warn('[Mobile TTS] ❌ Azure synthesis failed:', result.reason);
              resolve(false);
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('[Mobile TTS] ❌ Azure synthesis error:', error);
            try { synthesizer.close(); } catch (e) {}
            resolve(false);
          }
        );
      });

    } catch (error) {
      console.error('[Mobile TTS] ❌ Azure TTS setup failed:', error);
      return false;
    }
  } finally {
    // Always release mobile lock
    window.mobileTtsLock = false;
    console.log('[Mobile TTS] 🔓 Released mobile TTS lock');
  }
};

// 🎯 NEW: Queue-based mobile TTS (for auto-speak) - NO LOCK NEEDED
const speakTextMobileQueued = async (text, lang) => {
  console.log('[Mobile TTS Queue] Speaking:', text.substring(0, 30) + '...');
  
  // NO LOCK - queue system handles overlap prevention via isMobileSpeaking.current
  
  try {
    // Try Web Speech API first for mobile (more reliable)
    if (isMobile()) {
      console.log('[Mobile TTS Queue] 🎯 Trying Web Speech API first...');
      const webSpeechSuccess = await speakWithWebSpeechAPI(text, lang);
      if (webSpeechSuccess) {
        console.log('[Mobile TTS Queue] ✅ Web Speech API succeeded');
        return true;
      }
      console.log('[Mobile TTS Queue] 🔄 Web Speech API failed, falling back to Azure TTS');
    }

    // Fallback to Azure TTS with mobile-optimized config
    if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      console.warn('[Mobile TTS Queue] ❌ Azure credentials missing');
      return false;
    }

    try {
      console.log('[Mobile TTS Queue] 🔄 Starting Azure TTS fallback...');
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
        process.env.NEXT_PUBLIC_AZURE_REGION
      );
      
      const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
      speechConfig.speechSynthesisVoiceName = voice;
      console.log('[Mobile TTS Queue] 🎵 Using Azure voice:', voice);
      
      // Mobile-specific audio configuration
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('[Mobile TTS Queue] ⏰ Azure synthesis timeout after 10s');
          try { synthesizer.close(); } catch (e) {}
          resolve(false);
        }, 10000);

        synthesizer.speakTextAsync(
          text,
          (result) => {
            clearTimeout(timeoutId);
            try { synthesizer.close(); } catch (e) {}
            
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('[Mobile TTS Queue] ✅ Azure TTS synthesis completed');
              resolve(true);
            } else {
              console.warn('[Mobile TTS Queue] ❌ Azure synthesis failed:', result.reason);
              resolve(false);
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('[Mobile TTS Queue] ❌ Azure synthesis error:', error);
            try { synthesizer.close(); } catch (e) {}
            resolve(false);
          }
        );
      });

    } catch (error) {
      console.error('[Mobile TTS Queue] ❌ Azure TTS setup failed:', error);
      return false;
    }
  } catch (error) {
    console.error('[Mobile TTS Queue] ❌ Critical error:', error);
    return false;
  }
};

export default function BroadcastPage() {
  const { id } = useParams();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md')); // Now includes tablets/iPads (up to 900px)

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

  // Enhanced TTS state management for overlap prevention
  const ttsLock = useRef(false);
  const ttsPromiseRef = useRef(null);
  const ttsDebounceTimer = useRef(null);
  const lastTtsText = useRef('');

  // Mobile-specific TTS state
  const mobileTtsQueue = useRef([]);
  const isMobileSpeaking = useRef(false);
  const mobileTtsTimeout = useRef(null);

  // Add refs for stabilization timer
  const batchTimer = useRef(null);
  const lastFinalTranscriptionTime = useRef(0);
  const lastProcessedTranslation = useRef('');
  const stabilizationTimer = useRef(null);

  // Add fallback for when TTS fails completely
  const [ttsError, setTtsError] = useState(null);
  const [showTtsWarning, setShowTtsWarning] = useState(false);


  // ── NEW: Enhanced connection monitoring and recovery ──────────────────────────
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastTranscriptionTime, setLastTranscriptionTime] = useState(null);
  const [isStuck, setIsStuck] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState({});

  // Watchdog and recovery refs
  const connectionWatchdog = useRef(null);
  const transcriptionWatchdog = useRef(null);
  const reconnectionTimer = useRef(null);
  const stuckRecoveryTimer = useRef(null);
  const healthCheckInterval = useRef(null);

  // Connection state tracking
  const connectionStateRef = useRef({
    lastConnect: null,
    lastDisconnect: null,
    lastTranscription: null,
    reconnectCount: 0,
    stuckCount: 0,
    totalTranscriptions: 0,
    isRecovering: false
  });

  // ── Device-specific optimizations ──────────────────────────────────────────
  const deviceInfo = useMemo(() => {
    if (typeof navigator === 'undefined') return {};
    
    const userAgent = navigator.userAgent;
    const isMobileDevice = isMobile();
    const isTabletDevice = isTablet();
    const isSafariDevice = isSafari();
    const isIOSDevice = isIOS();
    
    return {
      isMobile: isMobileDevice,
      isTablet: isTabletDevice,
      isSafari: isSafariDevice,
      isIOS: isIOSDevice,
      userAgent,
      // Device-specific settings - INCREASED thresholds to prevent false positives
      socketReconnectDelay: isTabletDevice ? 2000 : 1000,
      watchdogInterval: isTabletDevice ? 15000 : 10000, // Check less frequently
      maxReconnectAttempts: isTabletDevice ? 10 : 5,
      stuckThreshold: isTabletDevice ? 60000 : 45000, // 60s for tablets, 45s for others (much longer!)
    };
  }, []);

  // ── Enhanced logging for debugging ──────────────────────────────────────────
  const logDebug = useCallback((category, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data: {
        ...data,
        deviceInfo: deviceInfo.isTablet ? 'tablet' : deviceInfo.isMobile ? 'mobile' : 'desktop',
        socketConnected,
        connectionStatus,
        isStuck,
        reconnectAttempts,
        totalTranscriptions: connectionStateRef.current.totalTranscriptions
      }
    };
    
    console.log(`[${category}] ${message}`, logEntry);
    
    // Keep debug info for potential error reporting
    setDebugInfo(prev => ({
      ...prev,
      [category]: logEntry
    }));
  }, [deviceInfo, socketConnected, connectionStatus, isStuck, reconnectAttempts]);

  // ── Connection recovery functions ──────────────────────────────────────────
  const resetConnectionState = useCallback(() => {
    console.log('[Connection] Resetting connection state');
    
    // Clear all timers
    if (connectionWatchdog.current) clearInterval(connectionWatchdog.current);
    if (transcriptionWatchdog.current) clearInterval(transcriptionWatchdog.current);
    if (reconnectionTimer.current) clearTimeout(reconnectionTimer.current);
    if (stuckRecoveryTimer.current) clearTimeout(stuckRecoveryTimer.current);
    
    // Reset states
    setConnectionStatus('disconnected');
    setIsStuck(false);
    connectionStateRef.current.isRecovering = false;
  }, []);

  const forceReconnect = useCallback(() => {
    console.log('[Connection] Forcing reconnection', { attempt: reconnectAttempts });
    
    resetConnectionState();
    
    // Close existing socket
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (e) {
        console.warn('[Connection] Error closing socket:', e);
      }
      socketRef.current = null;
    }
    
    // Increment reconnect attempts
    setReconnectAttempts(prev => prev + 1);
    connectionStateRef.current.reconnectCount++;
    
    // Delay before reconnecting (longer for tablets)
    const delay = deviceInfo.socketReconnectDelay * Math.min(reconnectAttempts + 1, 5);
    
    reconnectionTimer.current = setTimeout(() => {
      console.log('[Connection] Attempting reconnection after delay', { delay });
      // The useEffect will handle the actual reconnection
    }, delay);
  }, [resetConnectionState, reconnectAttempts, deviceInfo.socketReconnectDelay]);

  const handleStuckRecovery = useCallback(() => {
    console.log('[Recovery] Handling stuck recovery');
    
    setIsStuck(true);
    connectionStateRef.current.stuckCount++;
    
    // Clear various states that might be causing issues
    setCurrentInterimCaption("");
    setRealtimeTranslations({});
    
    // Clear TTS state
    ttsQueue.current = [];
    spokenSentences.current.clear();
    if (currentSynthesizerRef.current) {
      try { currentSynthesizerRef.current.close(); } catch(e) {}
      currentSynthesizerRef.current = null;
    }
    
    // Force reconnection
    forceReconnect();
    
    // Auto-clear stuck state after recovery attempt
    stuckRecoveryTimer.current = setTimeout(() => {
      setIsStuck(false);
      console.log('[Recovery] Stuck state cleared');
    }, 5000);
  }, [forceReconnect]);

  // ── Health check and watchdog systems ──────────────────────────────────────
  useEffect(() => {
    // Health check interval
    healthCheckInterval.current = setInterval(() => {
      const now = Date.now();
      const lastTranscription = connectionStateRef.current.lastTranscription;
      const timeSinceTranscription = lastTranscription ? now - lastTranscription : Infinity;
      const totalTranscriptions = connectionStateRef.current.totalTranscriptions;
      
      // Enhanced stuck detection - only trigger if we have real connection issues
      const shouldTriggerRecovery = (
        socketConnected && 
        timeSinceTranscription > deviceInfo.stuckThreshold && 
        !connectionStateRef.current.isRecovering &&
        totalTranscriptions > 0 && // Only after we've received at least one transcription
        (
          // Additional conditions that indicate actual problems:
          reconnectAttempts > 0 || // We've had previous reconnection issues
          connectionStateRef.current.stuckCount > 0 || // We've detected stuck state before
          !socketRef.current?.connected // Socket thinks it's disconnected
        )
      );
      
      if (shouldTriggerRecovery) {
        console.log('[Watchdog] Detected genuine stuck state (not just silence)', {
          timeSinceTranscription,
          threshold: deviceInfo.stuckThreshold,
          socketConnected,
          totalTranscriptions,
          reconnectAttempts,
          stuckCount: connectionStateRef.current.stuckCount,
          socketActuallyConnected: socketRef.current?.connected
        });
        
        handleStuckRecovery();
      } else if (timeSinceTranscription > deviceInfo.stuckThreshold && socketConnected) {
        // Log but don't trigger recovery for normal silence
        console.log('[Watchdog] Long silence detected but seems normal', {
          timeSinceTranscription,
          threshold: deviceInfo.stuckThreshold,
          totalTranscriptions,
          reason: totalTranscriptions === 0 ? 'No transcriptions yet' : 'Likely normal silence'
        });
      }
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        health: {
          timestamp: now,
          timeSinceTranscription,
          socketConnected,
          isStuck,
          connectionState: connectionStateRef.current
        }
      }));
      
    }, deviceInfo.watchdogInterval);
    
    return () => {
      if (healthCheckInterval.current) clearInterval(healthCheckInterval.current);
    };
  }, [socketConnected, deviceInfo.stuckThreshold, deviceInfo.watchdogInterval, isStuck, handleStuckRecovery, reconnectAttempts]);

  // ── Initialize audio context on component mount for Safari ──────────────────
  useEffect(() => {
    if (isSafari() || isIOS()) {
      audioContextRef.current = initializeAudioContext();
    }
    
    console.log('[Init] Component mounted', { deviceInfo });
    
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

  // Enhanced TTS function with proper semaphore locking
  const speakTextDesktop = useCallback(async (text, lang) => {
    // Basic validation
    if (!text || !process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      return false;
    }

    // Wait for any ongoing TTS to complete
    if (ttsPromiseRef.current) {
      try {
        await ttsPromiseRef.current;
      } catch (e) {
        console.log('[TTS] Previous TTS failed, continuing');
      }
    }

    // Create new TTS promise with proper locking
    ttsPromiseRef.current = new Promise(async (resolve, reject) => {
      try {
        // Safari/iOS specific workarounds
        const safariMode = isSafari() || isIOS();
        
        if (safariMode) {
          // Ensure audio context is active for Safari before each synthesis
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            try {
              await audioContextRef.current.resume();
              console.log('[TTS Desktop] Audio context resumed for synthesis');
            } catch (error) {
              console.warn('[TTS Desktop] Failed to resume audio context:', error);
            }
          }
          
          // Add small delay for Safari to prevent rapid-fire issues
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
          process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
          process.env.NEXT_PUBLIC_AZURE_REGION
        );
        
        const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
        speechConfig.speechSynthesisVoiceName = voice;
        
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
        
        // Store synthesizer reference
        currentSynthesizerRef.current = synthesizer;
        
        console.log(`[TTS Desktop] Starting synthesis for: "${text.substring(0, 30)}..."`);

        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              // Reset error count on success
              ttsErrorCount.current = 0;
              
              // Wait for audio to actually finish playing
              const audioDurationMs = result.audioDuration / 10000; // Convert to ms
              const waitTime = safariMode ? Math.min(audioDurationMs, 3000) : audioDurationMs;
              
              console.log(`[TTS Desktop] Synthesis complete. Waiting ${waitTime}ms for playback to finish.`);
              
              setTimeout(() => {
                try { synthesizer.close(); } catch(e) {}
                currentSynthesizerRef.current = null;
                console.log(`[TTS Desktop] Playback finished for: "${text.substring(0, 30)}..."`);
                resolve(true);
              }, waitTime);
            } else {
              console.warn(`[TTS Desktop] Synthesis failed. Reason: ${result.reason}`);
              try { synthesizer.close(); } catch(e) {}
              currentSynthesizerRef.current = null;
              resolve(false);
            }
          },
          (error) => {
            console.error(`[TTS Desktop] Error during synthesis: ${error}`);
            ttsErrorCount.current++;
            try { synthesizer.close(); } catch(e) {}
            currentSynthesizerRef.current = null;
            reject(error);
          }
        );
      } catch (error) {
        console.error(`[TTS Desktop] Critical error: ${error.message}`);
        ttsErrorCount.current++;
        reject(error);
      }
    });

    return ttsPromiseRef.current;
  }, []);

  // Debounced TTS function to prevent rapid-fire overlaps
  const debouncedTTS = useCallback((text, lang) => {
    // Clear previous timer
    if (ttsDebounceTimer.current) {
      clearTimeout(ttsDebounceTimer.current);
    }
    
    // If text is very similar to last one, debounce longer
    const similarity = lastTtsText.current && text.includes(lastTtsText.current) ? 500 : 200;
    
    console.log(`[TTS Debounce] Scheduling TTS with ${similarity}ms delay for: "${text.substring(0, 30)}..."`);
    
    ttsDebounceTimer.current = setTimeout(async () => {
      lastTtsText.current = text;
      
      // Add to spoken sentences BEFORE starting TTS to prevent duplicates
      spokenSentences.current.add(text);
      
      try {
        console.log(`[TTS Debounce] Starting TTS for: "${text.substring(0, 30)}..."`);
        const success = await speakTextDesktop(text, lang);
        
        if (!success) {
          console.warn(`[TTS Debounce] TTS failed for: "${text.substring(0, 30)}..."`);
          // Remove from spoken sentences if TTS failed
          spokenSentences.current.delete(text);
        }
      } catch (error) {
        console.error('[TTS Debounce] Error during debounced TTS:', error);
        // Remove from spoken sentences if TTS failed
        spokenSentences.current.delete(text);
      }
    }, similarity);
  }, [speakTextDesktop]);

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
  }, []); // No dependencies to prevent recreation

  // Mobile-specific TTS queue processor
  const processMobileQueue = useCallback(async () => {
    if (isMobileSpeaking.current || mobileTtsQueue.current.length === 0) {
      return; // Exit if already speaking or nothing to speak
    }

    isMobileSpeaking.current = true;
    const item = mobileTtsQueue.current.shift();
    
    console.log(`[Mobile TTS Queue] Processing item: "${item.text.substring(0, 30)}..." (${mobileTtsQueue.current.length} remaining)`);
    
    try {
      // 🎯 Use the new queued function that doesn't conflict with button locks
      const success = await speakTextMobileQueued(item.text, item.lang);
      console.log(`[Mobile TTS Queue] Item completed with success: ${success}`);
      
      if (!success) {
        setTtsError('Mobile TTS failed. Try again or use a different browser.');
        setTimeout(() => setTtsError(null), 5000);
      }
    } catch (error) {
      console.error('[Mobile TTS Queue] Error processing item:', error);
    } finally {
      isMobileSpeaking.current = false;
      
      // Process next item after a short delay
      if (mobileTtsQueue.current.length > 0) {
        mobileTtsTimeout.current = setTimeout(() => {
          processMobileQueue();
        }, 200); // Small delay between mobile TTS items
      }
    }
  }, []);

  // Add queue watchdog to restart stuck queues - simplified version
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      // If there are items in queue but nothing is speaking, restart the queue
      if (ttsQueue.current.length > 0 && !currentSynthesizerRef.current && autoSpeakLang) {
        console.log('[TTS Watchdog] Restarting stuck queue with', ttsQueue.current.length, 'items');
        processQueue();
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(watchdogInterval);
  }, [autoSpeakLang]); // Only depend on autoSpeakLang

  // TTS effect with enhanced error handling
  // NOTE: TTS is now handled directly in the socket transcription handler
  // to prevent dependency loops that were causing constant reconnections
  
  useEffect(() => {
    // Skip this effect for mobile - mobile uses immediate TTS
    if (isMobile()) return;
    
    if (!autoSpeakLang || !liveTranslations[autoSpeakLang]) return;

    const text = liveTranslations[autoSpeakLang].trim();
    if (!text || text.length < 10) return; // Skip very short texts
    
    console.log(`[TTS Effect] New translation: "${text}" for language: ${autoSpeakLang}`);
    
    // ... rest of TTS logic moved to socket handler
  }, [liveTranslations, autoSpeakLang, processQueue]);

  // Clear spoken sentences when auto-speak language changes
  useEffect(() => {
    spokenSentences.current.clear();
    ttsQueue.current = [];
    mobileTtsQueue.current = []; // Clear mobile queue
    isMobileSpeaking.current = false; // Reset mobile speaking state
    
    if (currentSynthesizerRef.current) {
      try { currentSynthesizerRef.current.close(); } catch(e) {}
      currentSynthesizerRef.current = null;
    }
    
    // Clear mobile TTS timeout
    if (mobileTtsTimeout.current) {
      clearTimeout(mobileTtsTimeout.current);
      mobileTtsTimeout.current = null;
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
      mobileTtsQueue.current = []; // Clear mobile queue
      isMobileSpeaking.current = false; // Reset mobile speaking state
      spokenSentences.current.clear();
      
      // Clear mobile TTS timeout
      if (mobileTtsTimeout.current) {
        clearTimeout(mobileTtsTimeout.current);
        mobileTtsTimeout.current = null;
      }
      
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
    // Prevent multiple connections
    if (socketRef.current || connectionStateRef.current.isRecovering) {
      console.log('[Connection] Skipping connection attempt - already connecting or recovering');
      return;
    }

    connectionStateRef.current.isRecovering = true;
    setConnectionStatus('connecting');
    
    console.log('[Connection] Initializing socket connection', { 
      url: SOCKET_URL, 
      roomId: id,
      deviceType: deviceInfo.isTablet ? 'tablet' : deviceInfo.isMobile ? 'mobile' : 'desktop'
    });

    const socket = io(SOCKET_URL, { 
      transports: ["websocket"],
      // Enhanced connection options for tablets
      timeout: deviceInfo.isTablet ? 10000 : 5000,
      reconnection: true,
      reconnectionDelay: deviceInfo.socketReconnectDelay,
      reconnectionAttempts: deviceInfo.maxReconnectAttempts,
      maxReconnectionAttempts: deviceInfo.maxReconnectAttempts,
      // Add ping/pong for connection health
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      const now = Date.now();
      connectionStateRef.current.lastConnect = now;
      connectionStateRef.current.isRecovering = false;
      
      console.log('[Connection] Socket connected successfully', { 
        socketId: socket.id,
        reconnectCount: connectionStateRef.current.reconnectCount
      });
      
      setSocketConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0); // Reset on successful connection
      
      // Join room
      socket.emit("join_room", { room: id });
      
      // Clear stuck state
      setIsStuck(false);
    });

    socket.on("disconnect", (reason) => {
      const now = Date.now();
      connectionStateRef.current.lastDisconnect = now;
      
      console.log('[Connection] Socket disconnected', { 
        reason,
        wasConnected: socketConnected,
        timeSinceConnect: connectionStateRef.current.lastConnect ? now - connectionStateRef.current.lastConnect : 'unknown'
      });
      
      setSocketConnected(false);
      setConnectionStatus('disconnected');
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'ping timeout') {
        console.log('[Connection] Scheduling auto-reconnect due to disconnect reason', { reason });
        // Use a simple timeout instead of forceReconnect to avoid dependency issues
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
        }, 2000);
      }
    });

    socket.on("connect_error", (err) => {
      console.log('[Connection] Socket connection error', { 
        error: err.message,
        type: err.type,
        reconnectAttempts: reconnectAttempts
      });
      
      setSocketConnected(false);
      setConnectionStatus('error');
      
      // If we've exceeded max attempts, try a full reset
      if (reconnectAttempts >= deviceInfo.maxReconnectAttempts) {
        console.log('[Connection] Max reconnect attempts reached, forcing full reset');
        // Use handleStuckRecovery without calling it directly to avoid dependency
        setTimeout(() => {
          setIsStuck(true);
          setReconnectAttempts(0);
        }, 1000);
      }
    });

    socket.on("realtime_transcription", async (data) => {
      const now = Date.now();
      connectionStateRef.current.lastTranscription = now;
      connectionStateRef.current.totalTranscriptions++;
      
      console.log('[Transcription] Received transcription', { 
        text: data.text ? data.text.substring(0, 50) + '...' : 'empty',
        is_final: data.is_final, 
        source_language: data.source_language,
        totalReceived: connectionStateRef.current.totalTranscriptions
      });
      
      setLastTranscriptionTime(now);
      
      // Clear stuck state when receiving transcriptions
      if (isStuck) {
        setIsStuck(false);
        console.log('[Recovery] Clearing stuck state - received transcription');
      }
      
      setLiveTranscriptionLang(data.source_language || "");

      if (data.is_final) {
        // Clear interim caption FIRST to prevent duplication
        setCurrentInterimCaption("");
        
        // Enhanced duplicate detection with better logic
        const now = Date.now();
        const timeSinceLastFinal = now - lastFinalTranscriptionTime.current;
        
        // More permissive timing for tablets (they might be slower)
        const minTimeBetweenFinals = deviceInfo.isTablet ? 300 : 500;
        
        if (timeSinceLastFinal < minTimeBetweenFinals) {
          console.log('[Transcription] Skipping rapid-fire final transcription', {
            text: data.text,
            timeSinceLastFinal,
            minTimeBetweenFinals
          });
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
            // Enhanced duplicate detection with better similarity checking
            const isDuplicate = prevCaptions.some(caption => {
              const timeDiff = Date.now() - caption.timestamp;
              
              // Check recent captions (extended time window for tablets)
              const maxCheckTime = deviceInfo.isTablet ? 8000 : 5000;
              if (timeDiff > maxCheckTime) return false;
              
              // Exact match
              if (caption.text === newCaption.text) return true;
              
              // Enhanced similarity check
              const captionWords = caption.text.toLowerCase().split(/\s+/);
              const newWords = newCaption.text.toLowerCase().split(/\s+/);
              
              // If texts are very similar in length and content
              if (Math.abs(captionWords.length - newWords.length) <= 2) {
                const commonWords = captionWords.filter(word => newWords.includes(word));
                const similarity = commonWords.length / Math.max(captionWords.length, newWords.length);
                
                // Lower similarity threshold for tablets to be more permissive
                const similarityThreshold = deviceInfo.isTablet ? 0.75 : 0.8;
                if (similarity > similarityThreshold) return true;
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
              console.log('[Transcription] Skipping duplicate caption', { text: newCaption.text });
              return prevCaptions;
            }
            
            console.log('[Transcription] Adding new caption', { text: newCaption.text });
            return [...prevCaptions, newCaption];
          });
        }
        
        // Enhanced translation handling with better error recovery
        if (data.text && data.text.trim() && translationLanguage) {
          const translationPromise = fetchTranslations(data.text.trim(), translationLanguage);
          
          // Add timeout for translation requests
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Translation timeout')), 
              deviceInfo.isTablet ? 8000 : 5000);
          });
          
          Promise.race([translationPromise, timeoutPromise])
            .then(async (translations) => {
              const targetLang = getLanguageCode(translationLanguage);
              const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
              const translatedText = translations[langCode];

              if (translatedText && translatedText.trim()) {
                const textToSpeak = translatedText.trim();
                
                // Enhanced TTS handling with better duplicate detection
                if (autoSpeakLang === langCode) {
                  // More sophisticated duplicate detection for TTS
                  const normalizedText = textToSpeak.toLowerCase().replace(/[^\w\s]/g, '').trim();
                  const isDuplicateForTTS = Array.from(spokenSentences.current).some(spoken => {
                    const normalizedSpoken = spoken.toLowerCase().replace(/[^\w\s]/g, '').trim();
                    return normalizedSpoken === normalizedText || 
                           (normalizedSpoken.includes(normalizedText) && normalizedText.length > 10) ||
                           (normalizedText.includes(normalizedSpoken) && normalizedSpoken.length > 10);
                  });

                  if (!isDuplicateForTTS) {
                    spokenSentences.current.add(textToSpeak);
                    
                    console.log('[TTS] Triggering automatic TTS for new translation', { 
                      text: textToSpeak.substring(0, 50) + '...',
                      lang: langCode,
                      deviceType: deviceInfo.isTablet ? 'tablet' : 'mobile'
                    });
                    
                    // Enhanced mobile/tablet TTS handling with queue
                    if (isMobile()) {
                      // Add to mobile queue instead of speaking immediately
                      if (translatedText && translatedText.trim().length >= 10) {
                        mobileTtsQueue.current.push({ text: translatedText.trim(), lang: langCode });
                        console.log(`[Mobile TTS] Added to queue: "${translatedText.trim().substring(0, 30)}..." (queue length: ${mobileTtsQueue.current.length})`);
                        
                        // Start processing if not already processing
                        if (!isMobileSpeaking.current) {
                          processMobileQueue();
                        }
                      }
                    } else {
                      // Desktop handling - add to queue for processing
                      ttsQueue.current.push({ text: translatedText.trim(), lang: langCode });
                      setTimeout(() => processQueue(), 100);
                    }
                  }
                }

                // Update display states
                setLiveTranslations(translations);
                setRealtimeTranslations({});

                // Add to persisted translations
                const newTranslation = {
                  id: Date.now() + Math.random(),
                  text: translatedText.trim(),
                  language: targetLang,
                  timestamp: Date.now()
                };

                setPersistedTranslations(prev => {
                  if (prev.length > 0 && prev[prev.length - 1].text === newTranslation.text) {
                    return prev;
                  }
                  return [...prev, newTranslation];
                });
              }
            })
            .catch((error) => {
              console.log('[Translation] Translation failed', { 
                error: error.message,
                text: data.text.substring(0, 50) 
              });
              
              // Don't let translation failures break the flow
              console.warn('[Translation] Failed but continuing:', error.message);
            });
        }
      } else {
        // Handle interim transcriptions - ONLY update display, never trigger TTS
        console.log('[Transcription] Setting interim caption', { text: data.text });
        setCurrentInterimCaption(data.text || "");
        
        // Update display only for interim translations, no TTS
        if (data.text && data.text.trim() && translationLanguage) {
          // Add timeout for interim translations too
          const translationPromise = fetchTranslations(data.text, translationLanguage);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Interim translation timeout')), 3000);
          });
          
          Promise.race([translationPromise, timeoutPromise])
            .then((translations) => {
              setRealtimeTranslations(translations);
            })
            .catch((error) => {
              // Silently handle interim translation failures
              console.log('[Translation] Interim translation failed', { error: error.message });
            });
        }
      }
    });

    socket.on("event_status_update", (data) => {
      if (data.room_id === id && ["Paused", "Completed", "Live"].includes(data.status)) {
        console.log('[Event] Status update received', { status: data.status });
        setEventData((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    // Enhanced cleanup
    return () => {
      console.log('[Connection] Cleaning up socket connection');
      
      connectionStateRef.current.isRecovering = false;
      
      // Clear all timers
      if (reconnectionTimer.current) clearTimeout(reconnectionTimer.current);
      if (stuckRecoveryTimer.current) clearTimeout(stuckRecoveryTimer.current);
      
      if (socketRef.current) {
        try {
          socketRef.current.emit("leave_room", { room: id });
          socketRef.current.disconnect();
        } catch (e) {
          console.warn('[Connection] Error during cleanup:', e);
        }
        socketRef.current = null;
      }
      
      setSocketConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [id, translationLanguage, autoSpeakLang]); // MINIMAL dependencies to prevent loops

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

  // Mobile-specific handlers
  const handleMobilePlayToggle = async () => {
    if (!translationLanguage || !displayedTranslation) return;
    
    const targetLang = getLanguageCode(translationLanguage);
    const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
    
    // Activate audio context immediately during user interaction
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('[Mobile Play] 🔊 Audio context resumed');
      } catch (error) {
        console.warn('[Mobile Play] ⚠️ Audio context failed:', error);
      }
    }
    
    // Toggle auto-speak
    if (autoSpeakLang === langCode) {
      console.log('[Mobile Play] 🛑 Disabling auto-speak');
      setAutoSpeakLang(null);
      
      // Stop any current speech
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      window.mobileTtsLock = false;
    } else {
      console.log('[Mobile Play] ▶️ Enabling auto-speak');
      setAutoSpeakLang(langCode);
      
      // Speak current text immediately if available
      if (displayedTranslation && displayedTranslation.trim().length >= 10) {
        console.log('[Mobile Play] 🎤 Speaking current text immediately');
        const success = await speakTextMobile(displayedTranslation.trim(), langCode);
        if (!success) {
          setTtsError('Mobile TTS failed. Try again or check browser permissions.');
          setTimeout(() => setTtsError(null), 5000);
        }
      }
    }
  };

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

      {/* Main Content - Responsive Layout */}
      {isMobileView ? (
        /* MOBILE & TABLET LAYOUT */
        <Box sx={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          bgcolor: "#f8f9fa",
          pb: { xs: 10, sm: 12 } // More space for taller control bar on tablets
        }}>
          {/* Mobile/Tablet Event Header */}
          <Box sx={{ p: { xs: 3, sm: 4 }, bgcolor: "white" }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: "#212B36", 
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "1.75rem" } // Larger on tablets
            }}>
              {eventData.title}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: "#637381",
              fontSize: { xs: "0.875rem", sm: "1rem" } // Larger on tablets
            }}>
              {eventData.description}
            </Typography>
          </Box>

          {/* Mobile/Tablet Live Interpretation Section */}
          <Box sx={{ flex: 1, p: { xs: 3, sm: 4 }, bgcolor: "white", mt: 2 }}>
            {/* Header with Language Selection */}
            <Box sx={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              mb: { xs: 3, sm: 4 } // More space on tablets
            }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                color: "#212B36",
                fontSize: { xs: "1.25rem", sm: "1.5rem" } // Larger on tablets
              }}>
                Live Interpretation
              </Typography>
              
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{
                  bgcolor: "#8B5CF6",
                  color: "white",
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 0.75, sm: 1 },
                  borderRadius: 3,
                  fontSize: { xs: "14px", sm: "16px" }, // Larger on tablets
                  fontWeight: 600
                }}>
                  {translationLanguage
                    ? getFullLanguageName(getBaseLangCode(translationLanguage))
                    : "No Language"}
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowDropDownIcon />}
                  onClick={(e) => setTranslationMenuAnchor(e.currentTarget)}
                  sx={{
                    textTransform: "none",
                    fontSize: { xs: "14px", sm: "16px" }, // Larger on tablets
                    color: "#637381",
                    fontWeight: 500
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

            {/* Translation Content */}
            <Box sx={{ 
              minHeight: { xs: "300px", sm: "400px" }, // Taller on tablets
              display: "flex", 
              alignItems: "flex-start",
              pt: { xs: 2, sm: 3 } // More padding on tablets
            }}>
              {!socketConnected ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body1" sx={{ 
                    color: "text.secondary",
                    fontSize: { xs: "1rem", sm: "1.125rem" } // Larger on tablets
                  }}>
                    {connectionStatus === 'connecting' ? 'Connecting...' :
                     connectionStatus === 'error' ? 'Connection failed, retrying...' :
                     'Waiting for connection...'}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ 
                  color: displayedTranslation ? "text.primary" : "text.secondary",
                  fontSize: { xs: "1.1rem", sm: "1.25rem" }, // Larger on tablets
                  lineHeight: 1.6,
                  fontWeight: 400
                }}>
                  {displayedTranslation || getPlaceholderText(translationLanguage)}
                </Typography>
              )}
            </Box>

            {/* TTS Error Notification for Mobile */}
            {ttsError && (
              <Box sx={{ 
                mt: 2,
                p: 2, 
                bgcolor: "#fff3cd", 
                border: "1px solid #ffeaa7", 
                borderRadius: 2,
                fontSize: "0.875rem",
                color: "#856404"
              }}>
                ⚠️ {ttsError}
              </Box>
            )}
          </Box>

          {/* Floating Play/Pause Button */}
          <Fab
            onClick={handleMobilePlayToggle}
            sx={{
              position: "fixed",
              bottom: { xs: 50, sm: 50 }, // Just above the control bar
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "white",
              color: "#8B5CF6",
              width: { xs: 74, sm: 84 }, // Larger on tablets
              height: { xs: 74, sm: 84 },
              border: "2px solid #8B5CF6", // Purple stroke matching the container
              zIndex: 1001, // Above the control bar
              boxShadow: "0px 4px 20px rgba(139, 92, 246, 0.3)",
              '&:hover': {
                bgcolor: "#f8f9fa",
                boxShadow: "0px 6px 25px rgba(139, 92, 246, 0.4)",
                borderColor: "#8B5CF6" // Keep purple border on hover
              }
            }}
          >
            {autoSpeakLang && translationLanguage && autoSpeakLang === getLanguageCode(translationLanguage).split(/[-_]/)[0].toLowerCase() ? 
              <PauseIcon sx={{ fontSize: { xs: 28, sm: 32 } }} /> : 
              <PlayArrowIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            }
          </Fab>

          {/* Mobile/Tablet Bottom Control Bar */}
          <Box sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: "#8B5CF6",
            height: { xs: 80, sm: 90 }, // Slightly taller on tablets
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 4, sm: 6 }, // More padding on tablets
            zIndex: 1000,
            borderRadius: "20px 20px 0 0"
          }}>
            {/* Menu Button */}
            <IconButton 
              sx={{ 
                color: "white",
                width: { xs: 48, sm: 56 }, // Larger on tablets
                height: { xs: 48, sm: 56 }
              }}
            >
              <MenuIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
            </IconButton>

            {/* Empty space where play button was */}
            <Box sx={{ width: { xs: 64, sm: 72 } }} />

            {/* Speaker Button */}
            <IconButton 
              sx={{ 
                color: "white",
                width: { xs: 48, sm: 56 }, // Larger on tablets
                height: { xs: 48, sm: 56 }
              }}
            >
              <VolumeUpIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        /* DESKTOP LAYOUT - Keep existing */
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36", fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                Live Transcription
              </Typography>
              
              {/* Connection Status Indicator */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: 
                    connectionStatus === 'connected' ? '#4CAF50' :
                    connectionStatus === 'connecting' ? '#FF9800' :
                    connectionStatus === 'error' ? '#F44336' : '#9E9E9E',
                  animation: connectionStatus === 'connecting' ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 }
                  }
                }} />
                <Typography variant="caption" sx={{ 
                  color: 
                    connectionStatus === 'connected' ? '#4CAF50' :
                    connectionStatus === 'connecting' ? '#FF9800' :
                    connectionStatus === 'error' ? '#F44336' : '#9E9E9E',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 500
                }}>
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'connecting' ? 'Connecting' :
                   connectionStatus === 'error' ? 'Error' : 'Disconnected'}
                </Typography>
              </Box>
              
              {/* Stuck State Indicator */}
              {isStuck && (
                <Box sx={{
                  bgcolor: "#FFF3E0",
                  color: "#F57C00",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: { xs: "11px", sm: "12px" },
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5
                }}>
                  ⚠️ Recovering
                </Box>
              )}
            </Box>

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
              
              {/* Manual Recovery Button */}
              {(connectionStatus === 'error' || isStuck || reconnectAttempts > 0) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleStuckRecovery}
                  sx={{
                    fontSize: { xs: "12px", sm: "13px" },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    px: { xs: 1, sm: 1.5 }
                  }}
                >
                  Retry
                </Button>
              )}
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body1" sx={{ color: "text.secondary", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {connectionStatus === 'connecting' ? 'Connecting...' :
                         connectionStatus === 'error' ? 'Connection failed, retrying...' :
                         'Waiting for connection...'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body1" sx={{ 
                      color: displayedCaption ? "text.primary" : "text.secondary",
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      lineHeight: { xs: 1.5, sm: 1.75 }
                    }}>
                      {displayedCaption || "Waiting for live transcription..."}
                    </Typography>
                  </Box>
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Button
                          onClick={() => setAutoSpeakLang(null)}
                          color="secondary"
                          size="small"
                          sx={{ 
                            fontSize: { xs: '0.8125rem', sm: '0.875rem' }
                          }}
                        >
                          Stop Auto-TTS
                        </Button>
                      </Box>
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
                          {displayedTranslation || getPlaceholderText(translationLanguage)}
                        </Typography>
                      </Box>
                      
                      {/* Enhanced TTS Button with better mobile/tablet handling */}
                      {translationLanguage && displayedTranslation && (
                        <Button
                          onClick={async () => {
                            const targetLang = getLanguageCode(translationLanguage);
                            const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
                            
                            // 🎯 SIMPLIFIED MOBILE/TABLET HANDLING - ONE TAP TO START/STOP
                            if (isMobile()) {
                              console.log('[Mobile TTS Button] 📱 Mobile button pressed');
                              
                              // Activate audio context immediately during user interaction
                              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                                try {
                                  await audioContextRef.current.resume();
                                  console.log('[Mobile TTS Button] 🔊 Audio context resumed');
                                } catch (error) {
                                  console.warn('[Mobile TTS Button] ⚠️ Audio context failed:', error);
                                }
                              }
                              
                              // Simple toggle: if already enabled, disable; if disabled, enable
                              if (autoSpeakLang === langCode) {
                                // STOP auto-speak
                                console.log('[Mobile TTS Button] 🛑 Disabling auto-speak');
                                setAutoSpeakLang(null);
                                
                                // Stop any current speech
                                if (window.speechSynthesis && window.speechSynthesis.speaking) {
                                  window.speechSynthesis.cancel();
                                }
                                window.mobileTtsLock = false;
                                
                              } else {
                                // START auto-speak
                                console.log('[Mobile TTS Button] ▶️ Enabling auto-speak');
                                setAutoSpeakLang(langCode);
                                
                                // Speak current text immediately if available
                                if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                  console.log('[Mobile TTS Button] 🎤 Speaking current text immediately');
                                  const success = await speakTextMobile(displayedTranslation.trim(), langCode);
                                  if (!success) {
                                    setTtsError('Mobile TTS failed. Try again or check browser permissions.');
                                    setTimeout(() => setTtsError(null), 5000);
                                  }
                                }
                              }
                              return;
                            }
                            
                            // 🖥️ DESKTOP HANDLING - KEEP EXISTING LOGIC  
                            if (autoSpeakLang === langCode) {
                              ttsQueue.current = [];
                              if (currentSynthesizerRef.current) {
                                try { currentSynthesizerRef.current.close(); } catch(e) {}
                                currentSynthesizerRef.current = null;
                              }
                              
                              ttsErrorCount.current = 0;
                              setTtsError(null);
                              
                              if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                // Use debounced TTS for button clicks too
                                debouncedTTS(displayedTranslation.trim(), langCode);
                              }
                              
                              return;
                            }
                            
                            // Safari/iOS handling for desktop
                            if (isSafari() || isIOS()) {
                              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                                try {
                                  await audioContextRef.current.resume();
                                } catch (error) {
                                  console.warn('Failed to activate audio context for Safari/iOS:', error);
                                }
                              }
                              
                              await new Promise(resolve => setTimeout(resolve, 50));
                            }
                            
                            setAutoSpeakLang(autoSpeakLang === langCode ? null : langCode);
                            
                            // Desktop handling - use debounced TTS to prevent overlaps
                            console.log('[TTS] Using debounced TTS for desktop', { 
                              text: displayedTranslation.trim().substring(0, 50) + '...',
                              lang: langCode
                            });
                            
                            // Remove from spoken sentences first since debouncedTTS will add it back
                            spokenSentences.current.delete(displayedTranslation);
                            
                            // Use debounced TTS instead of queue to prevent overlaps
                            debouncedTTS(displayedTranslation.trim(), langCode);
                          }}
                          sx={{ 
                            minWidth: { xs: '100%', sm: 0 },
                            justifyContent: { xs: 'center', sm: 'flex-start' }
                          }}
                          aria-label={`Auto-play TTS for ${getFullLanguageName(getBaseLangCode(translationLanguage))}`}
                          title={
                            autoSpeakLang === getLanguageCode(translationLanguage).split(/[-_]/)[0].toLowerCase() 
                              ? "🛑 Tap to stop auto-speech"
                              : "▶️ Tap to enable auto-speech"
                          }
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
      )}
    </Box>
  );
}