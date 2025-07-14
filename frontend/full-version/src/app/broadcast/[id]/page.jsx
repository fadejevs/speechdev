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

// 🚀 CSP-Compliant Silent Audio Creator (for Safari mobile TTS hack)
const createSilentAudioBlob = () => {
  // Create minimal WAV file (44 bytes header + minimal data)
  const arrayBuffer = new ArrayBuffer(78);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 70, true); // File size - 8
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (mono)
  view.setUint32(24, 22050, true); // SampleRate
  view.setUint32(28, 22050, true); // ByteRate
  view.setUint16(32, 1, true); // BlockAlign
  view.setUint16(34, 8, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, 34, true); // Subchunk2Size
  
  // Minimal silent data (34 bytes of silence)
  for (let i = 44; i < 78; i++) {
    view.setUint8(i, 128); // 8-bit silence value
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
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

// Function to wait for voices to load on iOS
const waitForVoicesToLoad = () => {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log('[Voice Loading] ✅ Voices already loaded:', voices.length);
      resolve(voices);
      return;
    }
    
    console.log('[Voice Loading] ⏳ Waiting for voices to load...');
    
    // Set up voice loading listener
    const onVoicesChanged = () => {
      const loadedVoices = speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        console.log('[Voice Loading] ✅ Voices loaded:', loadedVoices.length);
        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(loadedVoices);
      }
    };
    
    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('[Voice Loading] ⏰ Voice loading timeout, proceeding anyway');
      speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(speechSynthesis.getVoices());
    }, 5000);
  });
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
          // Don't treat "interrupted" as an error - it's expected when pausing
          if (event.error === 'interrupted') {
            console.log('[Mobile TTS] 🛑 Web Speech API interrupted (paused)');
            resolve(true); // Still consider it successful
          } else {
            console.error('[Mobile TTS] ❌ Web Speech API error:', {
              error: event.error,
              message: event.message,
              userAgent: navigator.userAgent
            });
            resolve(false);
          }
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
// Global audio state for overlap prevention
let currentAudioRef = null;
let isAudioPlaying = false;
let openAITTSQueue = [];
let isProcessingOpenAIQueue = false;

// Queue processor to ensure sequential playback
const processOpenAITTSQueue = async () => {
  if (isProcessingOpenAIQueue || openAITTSQueue.length === 0) {
    return;
  }
  
  isProcessingOpenAIQueue = true;
      // Starting TTS queue processing
  
  while (openAITTSQueue.length > 0) {
    const { text, lang, resolve, eventData } = openAITTSQueue.shift();
    // Processing TTS item
    
    try {
      const success = await speakWithOpenAIImmediate(text, lang, eventData);
      resolve(success);
    } catch (error) {
      console.error('[OpenAI TTS Queue] Error processing item:', error);
      resolve(false);
  }
  
    // Small delay between items to ensure clean separation
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessingOpenAIQueue = false;
  // Queue processing completed
};

// Queue-based OpenAI TTS function (public interface)
const speakWithOpenAI = async (text, lang, eventData = null) => {
  return new Promise((resolve) => {
    // Adding to TTS queue
    
    // Add to queue
    openAITTSQueue.push({ text, lang, resolve, eventData });
    
    // Start processing if not already processing
    processOpenAITTSQueue();
  });
};

// Immediate OpenAI TTS function (internal use only) - Mobile Optimized
const speakWithOpenAIImmediate = async (text, lang, eventData = null) => {
  try {
    console.log('[OpenAI TTS] Starting OpenAI TTS for:', text.substring(0, 30) + '...');
    
    // Set playing state immediately
    isAudioPlaying = true;
    
    // Voice selection based on admin preference
    const getVoiceForLanguage = (langCode, voiceType = 'female') => {
      // OpenAI voices: alloy (neutral), echo (male), fable (British), nova (female), onyx (male), shimmer (female)
      const voiceMap = {
        female: {
          'en': 'nova',
          'es': 'nova', 
          'fr': 'shimmer',
          'de': 'shimmer',
          'it': 'nova',
          'pt': 'nova',
          'zh': 'nova',
          'ja': 'nova',
          'ko': 'nova',
          'ru': 'shimmer',
          'ar': 'nova',
          'hi': 'shimmer',
          'default': 'nova'
        },
        male: {
          'en': 'echo',
          'es': 'onyx',
          'fr': 'echo', 
          'de': 'onyx',
          'it': 'echo',
          'pt': 'onyx',
          'zh': 'echo',
          'ja': 'echo',
          'ko': 'echo',
          'ru': 'onyx',
          'ar': 'echo',
          'hi': 'onyx',
          'default': 'echo'
        }
      };
      
      return voiceMap[voiceType]?.[langCode] || voiceMap[voiceType]?.default || 'alloy';
    };
    
    // Get voice type from event data or default to female
    const voiceType = eventData?.ttsVoice || 'female';
    const voice = getVoiceForLanguage(lang, voiceType);
    
    console.log('[OpenAI TTS] Using voice:', voice, 'for language:', lang);
    
    // Call our OpenAI TTS API with timeout for mobile
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for mobile
    
    const response = await fetch('/api/openai-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        speed: 1.0
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[OpenAI TTS] API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        isMobile: isMobile()
      });
      isAudioPlaying = false; // Reset on error
      return false;
    }

    // Create audio from the response with mobile optimization
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Store reference to current audio
    currentAudioRef = audio;
      
    // Mobile-specific audio settings
    if (isMobile()) {
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      // Ensure audio plays through speakers on mobile
      if (audio.setSinkId) {
        try {
          await audio.setSinkId('default');
        } catch (e) {
          console.warn('[OpenAI TTS] setSinkId not supported:', e);
        }
      }
    }
    
    // Play the audio with mobile-optimized handling
      return new Promise((resolve) => {
      let resolved = false;
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(audioUrl);
        isAudioPlaying = false;
      };
      
      audio.onended = () => {
        cleanup();
        console.log('[OpenAI TTS] ✅ Playback completed');
              resolve(true);
      };
      
      audio.onerror = (error) => {
        cleanup();
        console.error('[OpenAI TTS] ❌ Playback error:', error);
              resolve(false);
      };
      
      audio.onpause = () => {
        isAudioPlaying = false;
        console.log('[OpenAI TTS] Audio paused');
      };
      
      // Set a fallback timeout for mobile
      setTimeout(() => {
        if (!resolved && (audio.ended || audio.currentTime > 0)) {
          cleanup();
          console.log('[OpenAI TTS] ✅ Fallback timeout - audio likely completed');
              resolve(true);
        }
      }, 15000); // 15 second fallback timeout
      
      audio.play().then(() => {
        console.log('[OpenAI TTS] ✅ Started playback');
      }).catch((error) => {
        console.error('[OpenAI TTS] Failed to start playback:', error);
        cleanup();
            resolve(false);
      });
      });

    } catch (error) {
    console.error('[OpenAI TTS] ❌ Error:', error);
    isAudioPlaying = false; // Reset on error
      return false;
    }
};

// 🚀 SAFARI-PROOF Mobile TTS - Creates audio immediately, loads content dynamically
const speakTextMobile = async (text, lang, eventData = null, audioContextRef = null) => {
  console.log('[Safari Mobile TTS] 🎯 Starting SAFARI-PROOF OpenAI TTS for:', text.substring(0, 30) + '...');
  
  // Simple overlap prevention for mobile
  if (window.mobileTtsLock) {
    console.log('[Safari Mobile TTS] Another TTS is already in progress');
    return false;
  }
  
  // Set mobile lock
  window.mobileTtsLock = true;
  
  try {
    // Stop any existing audio first
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.currentTime = 0;
      isAudioPlaying = false;
    }

    // Check if we're already speaking and handle interruption
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 🔥 SAFARI HACK: Create Audio object IMMEDIATELY in user interaction call stack
    console.log('[Safari Mobile TTS] 🎯 Creating placeholder audio IMMEDIATELY (Safari hack)');
    
    // Create CSP-compliant silent audio blob
    const silentBlob = createSilentAudioBlob();
    const silentBlobURL = URL.createObjectURL(silentBlob);
    const placeholderAudio = new Audio(silentBlobURL);
    
    // Clean up blob URL when done
    placeholderAudio.addEventListener('ended', () => URL.revokeObjectURL(silentBlobURL));
    placeholderAudio.addEventListener('error', () => URL.revokeObjectURL(silentBlobURL));
      
         // OLD CSP-VIOLATING METHOD (commented out):
     // const silentAudioDataURL = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0EAAAAPAAADAAAAAAAAAA...';
     // const placeholderAudio = new Audio(silentAudioDataURL);
    
    // 🎯 CRITICAL: Set up mobile audio properties BEFORE playing
    if (isMobile()) {
      placeholderAudio.preload = 'auto';
      placeholderAudio.crossOrigin = 'anonymous';
      placeholderAudio.muted = false; // Ensure not muted
      if (placeholderAudio.setSinkId) {
        try {
          await placeholderAudio.setSinkId('default');
        } catch (e) {
          console.warn('[Safari Mobile TTS] setSinkId not supported:', e);
        }
      }
    }
    
    // Store reference immediately
    currentAudioRef = placeholderAudio;
    isAudioPlaying = true;
    
    // Ensure audio context is active for mobile (only if provided)
    if (audioContextRef && audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('[Safari Mobile TTS] Audio context resumed');
    } catch (error) {
        console.warn('[Safari Mobile TTS] Audio context resume failed:', error);
      }
    }
    
    // 🚀 PLAY PLACEHOLDER IMMEDIATELY (this claims Safari's permission)
    console.log('[Safari Mobile TTS] 🎯 Playing placeholder audio to claim Safari permission...');
    await placeholderAudio.play();
    console.log('[Safari Mobile TTS] ✅ Placeholder audio started - Safari permission claimed!');
    
    // 🚀 NOW FETCH OPENAI AUDIO AND SWAP SOURCE DYNAMICALLY
    const success = await swapToOpenAIAudio(placeholderAudio, text, lang, eventData);
    
    if (success) {
      console.log('[Safari Mobile TTS] ✅ OpenAI TTS successful with Safari hack');
      return true;
    } else {
      console.error('[Safari Mobile TTS] ❌ OpenAI TTS failed - no fallback');
      return false;
    }
    
  } catch (error) {
    console.error('[Safari Mobile TTS] ❌ OpenAI TTS error:', error.message);
    return false;
  } finally {
    // Always release mobile lock
    window.mobileTtsLock = false;
  }
};

// 🚀 SAFARI HACK: Dynamically swap audio source while keeping the same Audio object
const swapToOpenAIAudio = async (audioElement, text, lang, eventData = null) => {
  try {
    console.log('[Safari Audio Swap] 🔄 Fetching OpenAI audio while placeholder plays...');
    
    // Voice selection based on admin preference
    const getVoiceForLanguage = (langCode, voiceType = 'female') => {
      const voiceMap = {
        female: {
          'en': 'nova', 'es': 'nova', 'fr': 'shimmer', 'de': 'shimmer', 'it': 'nova',
          'pt': 'nova', 'zh': 'nova', 'ja': 'nova', 'ko': 'nova', 'ru': 'shimmer',
          'ar': 'nova', 'hi': 'shimmer', 'default': 'nova'
        },
        male: {
          'en': 'echo', 'es': 'onyx', 'fr': 'echo', 'de': 'onyx', 'it': 'echo',
          'pt': 'onyx', 'zh': 'echo', 'ja': 'echo', 'ko': 'echo', 'ru': 'onyx',
          'ar': 'echo', 'hi': 'onyx', 'default': 'echo'
        }
      };
      return voiceMap[voiceType]?.[langCode] || voiceMap[voiceType]?.default || 'alloy';
    };
    
    const voiceType = eventData?.ttsVoice || 'female';
    const voice = getVoiceForLanguage(lang, voiceType);
    
    // Call OpenAI TTS API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('/api/openai-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, voice: voice, speed: 1.0 }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Safari Audio Swap] ❌ OpenAI API Error:', response.status, errorData);
      return false;
    }

    // Get audio blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log('[Safari Audio Swap] 🎯 OpenAI audio fetched, swapping source dynamically...');
    
    // 🚀 CRITICAL SAFARI HACK: Dynamically change the src while audio is playing
    // Safari allows this because the Audio object was created in user interaction call stack
    audioElement.src = audioUrl;
    audioElement.load(); // Reload with new source

    return new Promise((resolve) => {
      let resolved = false;
      let timeoutId = null;
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        
        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Clean up audio URL
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (e) {
          console.warn('[Safari Audio Swap] URL cleanup failed:', e);
        }
        
        // Reset audio state
        isAudioPlaying = false;
        
        // Remove event listeners to prevent memory leaks
        audioElement.onended = null;
        audioElement.onerror = null;
        audioElement.onpause = null;
        audioElement.onplay = null;
      };
      
      audioElement.onended = () => {
        cleanup();
        console.log('[Safari Audio Swap] ✅ OpenAI audio playback completed');
        resolve(true);
      };
      
      audioElement.onerror = (error) => {
        cleanup();
        console.error('[Safari Audio Swap] ❌ Audio playback error:', error);
        resolve(false);
      };
      
      // Additional event listeners for better state tracking
      audioElement.onpause = () => {
        console.log('[Safari Audio Swap] Audio paused');
        isAudioPlaying = false;
      };
      
      audioElement.onplay = () => {
        console.log('[Safari Audio Swap] Audio started playing');
        isAudioPlaying = true;
      };
      
      // Enhanced fallback timeout for mobile with better detection
      timeoutId = setTimeout(() => {
        if (!resolved) {
          // More sophisticated completion detection
          const hasPlayed = audioElement.currentTime > 0;
          const isComplete = audioElement.ended || 
                           (hasPlayed && audioElement.currentTime >= audioElement.duration - 0.1);
          
          if (isComplete) {
            cleanup();
            console.log('[Safari Audio Swap] ✅ Fallback timeout - audio completed');
            resolve(true);
          } else if (hasPlayed) {
            cleanup();
            console.log('[Safari Audio Swap] ⚠️ Fallback timeout - audio may have completed');
            resolve(true); // Assume success if it played at all
          } else {
            cleanup();
            console.log('[Safari Audio Swap] ❌ Fallback timeout - audio never played');
            resolve(false);
          }
        }
      }, 15000); // 15 second fallback timeout
      
      // Start playing the new audio with enhanced error handling
      audioElement.play().then(() => {
        console.log('[Safari Audio Swap] ✅ OpenAI audio started playing');
      }).catch((error) => {
        console.error('[Safari Audio Swap] ❌ Failed to play OpenAI audio:', error);
        cleanup();
        resolve(false);
      });
    });

  } catch (error) {
    console.error('[Safari Audio Swap] ❌ Error swapping audio:', error);
    isAudioPlaying = false;
    return false;
  }
};

// 🚀 SAFARI-PROOF Mobile Queue TTS - Creates audio immediately, loads content dynamically
const speakTextMobileQueued = async (text, lang, eventData = null, audioContextRef = null) => {
  // NO LOCK - queue system handles overlap prevention via isMobileSpeaking.current
  
  try {
    // Stop any existing audio first
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.currentTime = 0;
      isAudioPlaying = false;
    }
    
    // 🔊 ENHANCED: Double-check audio context state before attempting TTS
    if (audioContextRef && audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('[Safari Mobile TTS Queue] 🔊 Audio context resumed before TTS');
        } catch (error) {
          console.warn('[Safari Mobile TTS Queue] ⚠️ Audio context resume failed:', error);
        }
      } else if (audioContextRef.current.state === 'closed') {
        console.warn('[Safari Mobile TTS Queue] ⚠️ Audio context is closed - TTS may fail');
      }
    }
    
    // 🔥 SAFARI HACK: For queued items, also use Safari-proof approach
    console.log('[Safari Mobile TTS Queue] 🎯 Creating placeholder audio for queue (Safari hack)');
    
    // Create CSP-compliant silent audio blob
    const silentBlob = createSilentAudioBlob();
    const silentBlobURL = URL.createObjectURL(silentBlob);
    const placeholderAudio = new Audio(silentBlobURL);
    
    // Enhanced cleanup to prevent memory leaks
    const cleanupBlob = () => {
      try {
        URL.revokeObjectURL(silentBlobURL);
      } catch (e) {
        console.warn('[Safari Mobile TTS Queue] Blob cleanup failed:', e);
      }
    };
    
    placeholderAudio.addEventListener('ended', cleanupBlob);
    placeholderAudio.addEventListener('error', cleanupBlob);
    
    // 🎯 CRITICAL: Set up mobile audio properties BEFORE playing
    if (isMobile()) {
      placeholderAudio.preload = 'auto';
      placeholderAudio.crossOrigin = 'anonymous';
      placeholderAudio.muted = false; // Ensure not muted
      
      // Enhanced audio setup for mobile
      placeholderAudio.volume = 1.0;
      placeholderAudio.playbackRate = 1.0;
      
      if (placeholderAudio.setSinkId) {
        try {
          await placeholderAudio.setSinkId('default');
        } catch (e) {
          console.warn('[Safari Mobile TTS Queue] setSinkId not supported:', e);
        }
      }
    }
    
    // Store reference immediately
    currentAudioRef = placeholderAudio;
    isAudioPlaying = true;
    
    // 🚀 PLAY PLACEHOLDER IMMEDIATELY (this claims Safari's permission)
    console.log('[Safari Mobile TTS Queue] 🎯 Playing placeholder audio to claim Safari permission...');
    
    try {
      await placeholderAudio.play();
      console.log('[Safari Mobile TTS Queue] ✅ Placeholder audio started - Safari permission claimed!');
    } catch (playError) {
      console.error('[Safari Mobile TTS Queue] ❌ Placeholder audio play failed:', playError);
      cleanupBlob();
      isAudioPlaying = false;
      return false;
    }
    
    // 🚀 NOW FETCH OPENAI AUDIO AND SWAP SOURCE DYNAMICALLY
    const success = await swapToOpenAIAudio(placeholderAudio, text, lang, eventData);
    
    if (success) {
      console.log('[Safari Mobile TTS Queue] ✅ OpenAI TTS successful with Safari hack');
      return true;
    } else {
      console.error('[Safari Mobile TTS Queue] ❌ OpenAI TTS failed - no fallback');
      cleanupBlob();
      return false;
    }

  } catch (error) {
    console.error('[Safari Mobile TTS Queue] ❌ OpenAI TTS error:', error.message);
    isAudioPlaying = false;
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
  const [showTtsWarning, setShowTtsWarning] = useState(false);
  
  // TTS Loading state for mobile
  const [ttsLoading, setTtsLoading] = useState(false);


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
        // Long silence detected but seems normal
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
    
    // Component mounted
    
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

  // Global translation management with circuit breaker
  const translationCache = useRef(new Map());
  const translationRequestQueue = useRef([]);
  const isProcessingTranslations = useRef(false);
  const lastTranslationRequest = useRef(0);
  const activeTranslationRequests = useRef(new Set());
  const translationErrorCount = useRef(0);
  const lastTranslationError = useRef(0);
  const translationCircuitOpen = useRef(false);

  // Global translation request manager with circuit breaker
  const fetchTranslations = async (text, langOverride) => {
    const out = {};
    const raw = getLanguageCode(langOverride);
    if (!raw) {
      console.warn("No target language set, skipping fallback");
      return out;
    }
    const toCode = raw.split(/[-_]/)[0].toLowerCase();
    
    // Circuit breaker: Stop making requests if too many failures
    const currentTime = Date.now();
    if (translationCircuitOpen.current) {
      if (currentTime - lastTranslationError.current < 30000) { // 30 second cooldown
        console.log("[Translation] Circuit breaker open, skipping request");
        return out;
      } else {
        // Reset circuit breaker after cooldown
        translationCircuitOpen.current = false;
        translationErrorCount.current = 0;
        console.log("[Translation] Circuit breaker reset");
      }
    }
    
    // Create cache key
    const cacheKey = `${text}_${toCode}`;
    
    // Check cache first
    if (translationCache.current.has(cacheKey)) {
      console.log("[Translation] Using cached translation for:", text.substring(0, 30) + '...');
      const cachedTranslation = translationCache.current.get(cacheKey);
      out[toCode] = cachedTranslation;
      return out;
    }

    // Check if this exact request is already in progress
    if (activeTranslationRequests.current.has(cacheKey)) {
      console.log("[Translation] Request already in progress, waiting:", text.substring(0, 30) + '...');
      
      // Wait for the active request to complete and then check cache
      return new Promise((resolve) => {
        const checkCache = () => {
          if (translationCache.current.has(cacheKey)) {
            const cachedTranslation = translationCache.current.get(cacheKey);
            resolve({ [toCode]: cachedTranslation });
          } else if (!activeTranslationRequests.current.has(cacheKey)) {
            // Request completed but no cache entry - request failed
            resolve({});
          } else {
            // Still processing, check again
            setTimeout(checkCache, 100);
          }
        };
        setTimeout(checkCache, 100);
      });
    }

    // Rate limiting - prevent too many requests
    const requestTime = Date.now();
    if (requestTime - lastTranslationRequest.current < 300) { // Increased to 300ms for more stability
      console.log("[Translation] Rate limited, queuing request:", text.substring(0, 30) + '...');
      
      return new Promise((resolve) => {
        translationRequestQueue.current.push({ text, toCode, cacheKey, resolve });
        processTranslationQueue();
      });
    }

    lastTranslationRequest.current = requestTime;
    
    // Mark request as active
    activeTranslationRequests.current.add(cacheKey);
    
    try {
      console.log("[Translation] Making API request for:", text.substring(0, 30) + '...');
      
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: text,
          target_lang: toCode.toUpperCase()
        }),
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error("[Translation] API Error:", {
          status: res.status,
          statusText: res.statusText,
          error: err
        });
        
        // Track errors for circuit breaker
        translationErrorCount.current++;
        lastTranslationError.current = Date.now();
        
        // Open circuit breaker after 3 consecutive errors
        if (translationErrorCount.current >= 3) {
          translationCircuitOpen.current = true;
          console.warn("[Translation] Circuit breaker opened due to repeated failures");
        }
        
        return out;
      }
      
      const { translation } = await res.json();
      
      // Cache the translation
      translationCache.current.set(cacheKey, translation);
      
      // Limit cache size to prevent memory issues
      if (translationCache.current.size > 100) {
        const firstKey = translationCache.current.keys().next().value;
        translationCache.current.delete(firstKey);
      }
      
      out[toCode] = translation;
      console.log("[Translation] ✅ Success and cached:", text.substring(0, 30) + '...');
      
      // Reset error count on success
      translationErrorCount.current = 0;
      
    } catch (e) {
      console.error("[Translation] Request failed:", e);
      
      // Track errors for circuit breaker
      translationErrorCount.current++;
      lastTranslationError.current = Date.now();
      
      if (translationErrorCount.current >= 3) {
        translationCircuitOpen.current = true;
        console.warn("[Translation] Circuit breaker opened due to repeated failures");
      }
    } finally {
      // Always remove from active requests
      activeTranslationRequests.current.delete(cacheKey);
    }
    
    return out;
  };

  // Process queued translation requests
  const processTranslationQueue = useCallback(async () => {
    if (isProcessingTranslations.current || translationRequestQueue.current.length === 0) {
      return;
    }

    isProcessingTranslations.current = true;
    
    while (translationRequestQueue.current.length > 0) {
      const { text, toCode, cacheKey, resolve } = translationRequestQueue.current.shift();
      
      try {
        // Check cache again (might have been added while waiting)
        if (translationCache.current.has(cacheKey)) {
          const cachedTranslation = translationCache.current.get(cacheKey);
          resolve({ [toCode]: cachedTranslation });
          continue;
        }

        // Check if already in progress
        if (activeTranslationRequests.current.has(cacheKey)) {
          console.log("[Translation Queue] Request already active, skipping:", text.substring(0, 30) + '...');
          resolve({});
          continue;
        }

        console.log("[Translation Queue] Processing:", text.substring(0, 30) + '...');
        
        // Mark as active
        activeTranslationRequests.current.add(cacheKey);
        
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: text,
            target_lang: toCode.toUpperCase()
          }),
        });
        
        if (!res.ok) {
          console.error("[Translation Queue] API Error:", res.status);
          resolve({});
          continue;
        }
        
        const { translation } = await res.json();
        
        // Cache the translation
        translationCache.current.set(cacheKey, translation);
        
        resolve({ [toCode]: translation });
        console.log("[Translation Queue] ✅ Success:", text.substring(0, 30) + '...');
        
          } catch (error) {
        console.error("[Translation Queue] Error:", error);
        resolve({});
      } finally {
        // Always remove from active requests
        activeTranslationRequests.current.delete(cacheKey);
        }
        
      // Small delay between requests to prevent API overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    isProcessingTranslations.current = false;
  }, []);

  // Desktop OpenAI TTS ONLY - No fallback
  const speakText = useCallback(async (text, lang, onDone) => {
    // Basic validation
    if (!text) {
      if (onDone) onDone(false);
      return;
    }

    console.log('[Desktop TTS] Starting OpenAI TTS exclusively...');
    
    // OpenAI TTS ONLY - No fallback
    try {
      const openAISuccess = await speakWithOpenAI(text, lang, eventData);
      if (openAISuccess) {
        console.log('[Desktop TTS] ✅ OpenAI TTS successful');
        if (onDone) onDone(true);
        return;
      } else {
        console.error('[Desktop TTS] ❌ OpenAI TTS failed - no fallback');
        if (onDone) onDone(false);
        return;
      }
    } catch (error) {
      console.error('[Desktop TTS] ❌ OpenAI TTS error:', error.message);
      if (onDone) onDone(false);
      return;
    }
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

  }, []);

  // Desktop OpenAI TTS ONLY - No fallback
  const speakTextDesktop = useCallback(async (text, lang) => {
    // Basic validation
    if (!text) {
      return false;
    }

    console.log('[Desktop TTS] Starting OpenAI TTS exclusively...');
    
    // OpenAI TTS ONLY - No fallback
    try {
      const openAISuccess = await speakWithOpenAI(text, lang, eventData);
      if (openAISuccess) {
        console.log('[Desktop TTS] ✅ OpenAI TTS successful');
        return true;
            } else {
        console.error('[Desktop TTS] ❌ OpenAI TTS failed - no fallback');
        return false;
          }
      } catch (error) {
      console.error('[Desktop TTS] ❌ OpenAI TTS error:', error.message);
      return false;
      }
  }, []);

  // Debounced OpenAI TTS ONLY - No fallback
  const debouncedTTS = useCallback((text, lang, eventDataParam = null) => {
    // Clear previous timer
    if (ttsDebounceTimer.current) {
      clearTimeout(ttsDebounceTimer.current);
    }
    
    // Check if audio is currently playing - if so, wait a bit longer (OPTIMIZED FOR SPEED)
    const baseDelay = isAudioPlaying ? 300 : 100;  // Reduced: 500→300, 200→100
    const similarity = lastTtsText.current && text.includes(lastTtsText.current) ? baseDelay + 150 : baseDelay; // Reduced: 300→150
    
    console.log(`[TTS Debounce] Scheduling OpenAI TTS with ${similarity}ms delay for: "${text.substring(0, 30)}..." (audio playing: ${isAudioPlaying})`);
    
    ttsDebounceTimer.current = setTimeout(async () => {
      // Double-check if we should skip due to audio still playing
      if (isAudioPlaying) {
        console.log('[TTS Debounce] ⏭️ Skipping - audio still playing from previous TTS');
        return;
      }
      
      lastTtsText.current = text;
      
      // Add to spoken sentences BEFORE starting TTS to prevent duplicates
      spokenSentences.current.add(text);
      
      try {
        console.log(`[TTS Debounce] Starting OpenAI TTS exclusively for: "${text.substring(0, 30)}..."`);
        
        // OpenAI TTS ONLY - No fallback
        const success = await speakWithOpenAI(text, lang, eventDataParam || eventData);
        
        if (!success) {
          console.error(`[TTS Debounce] ❌ OpenAI TTS failed - no fallback for: "${text.substring(0, 30)}..."`);
          // Remove from spoken sentences if TTS failed
          spokenSentences.current.delete(text);
        } else {
          console.log(`[TTS Debounce] ✅ OpenAI TTS successful for: "${text.substring(0, 30)}..."`);
        }
      } catch (error) {
        console.error('[TTS Debounce] ❌ OpenAI TTS error:', error.message);
        // Remove from spoken sentences if TTS failed
        spokenSentences.current.delete(text);
      }
    }, similarity);
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
  }, []); // No dependencies to prevent recreation

  // Mobile-specific TTS queue processor with enhanced error handling
  const processMobileQueue = useCallback(async () => {
    if (isMobileSpeaking.current || mobileTtsQueue.current.length === 0) {
      return; // Exit if already speaking or nothing to speak
    }

    isMobileSpeaking.current = true;
    window.mobileTtsStartTime = Date.now(); // Track start time for watchdog
    const item = mobileTtsQueue.current.shift();
    
    console.log(`[Mobile TTS Queue] Processing item: "${item.text.substring(0, 30)}..." (${mobileTtsQueue.current.length} remaining)`);
    
    try {
      // 🔊 CRITICAL: Reactivate audio context before each TTS attempt
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('[Mobile TTS Queue] 🔊 Audio context resumed before TTS');
        } catch (error) {
          console.warn('[Mobile TTS Queue] ⚠️ Audio context resume failed:', error);
        }
      }
      
      // 🎯 Use the new queued function that doesn't conflict with button locks
      const success = await speakTextMobileQueued(item.text, item.lang, eventData, audioContextRef);
      console.log(`[Mobile TTS Queue] Item completed with success: ${success}`);
      
      if (!success) {
        console.log('[Mobile TTS Queue] Item failed - will retry queue processing');
        // Don't stop queue processing on failure - continue with next item
      }
    } catch (error) {
      console.error('[Mobile TTS Queue] Error processing item:', error);
    } finally {
      // Always reset speaking state regardless of success/failure
      isMobileSpeaking.current = false;
      window.mobileTtsStartTime = 0; // Reset start time
      
      // Process next item after a short delay
      if (mobileTtsQueue.current.length > 0) {
        mobileTtsTimeout.current = setTimeout(() => {
          console.log(`[Mobile TTS Queue] 🔄 Processing next item (${mobileTtsQueue.current.length} remaining)`);
          processMobileQueue();
        }, 150); // Slightly increased for better reliability
      } else {
        console.log('[Mobile TTS Queue] ✅ Queue processing completed');
      }
    }
  }, []);

  // Add queue watchdog to restart stuck queues - simplified version
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      // Desktop queue watchdog
      if (ttsQueue.current.length > 0 && !currentSynthesizerRef.current && autoSpeakLang) {
        console.log('[TTS Watchdog] Restarting stuck queue with', ttsQueue.current.length, 'items');
        processQueue();
      }
      
      // Mobile queue watchdog - detect and recover from stuck mobile TTS
      if (isMobile() && mobileTtsQueue.current.length > 0 && !isMobileSpeaking.current && autoSpeakLang) {
        console.log('[Mobile TTS Watchdog] 🔄 Restarting stuck mobile queue with', mobileTtsQueue.current.length, 'items');
        processMobileQueue();
      }
      
      // Additional mobile TTS health check
      if (isMobile() && isMobileSpeaking.current) {
        // Check if mobile TTS has been speaking for too long (might be stuck)
        const mobileTtsStartTime = window.mobileTtsStartTime || 0;
        const currentTime = Date.now();
        const speakingDuration = currentTime - mobileTtsStartTime;
        
        // If speaking for more than 30 seconds, consider it stuck
        if (speakingDuration > 30000) {
          console.log('[Mobile TTS Watchdog] ⚠️ Mobile TTS stuck for', speakingDuration / 1000, 'seconds - force recovery');
          
          // Force reset mobile TTS state
          isMobileSpeaking.current = false;
          window.mobileTtsLock = false;
          
          // Stop any current audio
          if (currentAudioRef && !currentAudioRef.paused) {
            currentAudioRef.pause();
            currentAudioRef.currentTime = 0;
            isAudioPlaying = false;
          }
          
          // Clear mobile TTS timeout
          if (mobileTtsTimeout.current) {
            clearTimeout(mobileTtsTimeout.current);
            mobileTtsTimeout.current = null;
          }
          
          // Restart queue processing if items remain
          if (mobileTtsQueue.current.length > 0) {
            console.log('[Mobile TTS Watchdog] 🔄 Restarting after force recovery');
            processMobileQueue();
          }
        }
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
    window.mobileTtsStartTime = 0; // Reset mobile TTS start time
    window.mobileTtsLock = false; // Reset mobile TTS lock
    
    if (currentSynthesizerRef.current) {
      try { currentSynthesizerRef.current.close(); } catch(e) {}
      currentSynthesizerRef.current = null;
    }
    
    // Clear mobile TTS timeout
    if (mobileTtsTimeout.current) {
      clearTimeout(mobileTtsTimeout.current);
      mobileTtsTimeout.current = null;
    }
    
    // Stop any current audio
    if (currentAudioRef && !currentAudioRef.paused) {
      currentAudioRef.pause();
      currentAudioRef.currentTime = 0;
      isAudioPlaying = false;
    }
    
    // Clear OpenAI TTS queue
    openAITTSQueue.forEach(item => item.resolve(false));
    openAITTSQueue = [];
    isProcessingOpenAIQueue = false;
    
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
    
    // Initializing socket connection

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
      
      // Socket connected successfully
      
      setSocketConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0); // Reset on successful connection
      
      // Reset translation circuit breaker on successful connection
      translationCircuitOpen.current = false;
      translationErrorCount.current = 0;
      // Circuit breaker reset on reconnection
      
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
      
      // Received transcription
      
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
                      setTimeout(() => processQueue(), 50);  // Reduced: 100→50ms for faster queue processing
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
        // Setting interim caption
        setCurrentInterimCaption(data.text || "");
        
        // Update display only for interim translations, no TTS
        // Much more aggressive protection for interim translations
        if (data.text && data.text.trim() && translationLanguage && 
            data.text.length > 20 && // Increased from 5 to 20
            !translationCircuitOpen.current) {
          
          // Additional protection: Only translate if text changed significantly
          const currentWords = data.text.split(' ').length;
          const lastInterimKey = `interim_${translationLanguage}`;
          const lastInterimText = translationCache.current.get(lastInterimKey);
          
          if (!lastInterimText || 
              Math.abs(currentWords - lastInterimText.split(' ').length) > 3 ||
              data.text.length > lastInterimText.length + 20) {
            
            // Cache the interim text to prevent duplicate requests
            translationCache.current.set(lastInterimKey, data.text);
            
            // Only translate interim text if it's substantial (reduce API calls)
          const translationPromise = fetchTranslations(data.text, translationLanguage);
          const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Interim translation timeout')), 1500); // Shorter timeout for interim
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
      // Cleaning up socket connection
      
      connectionStateRef.current.isRecovering = false;
      
      // Clear all timers
      if (reconnectionTimer.current) clearTimeout(reconnectionTimer.current);
      if (stuckRecoveryTimer.current) clearTimeout(stuckRecoveryTimer.current);
      
      // Cleanup OpenAI TTS audio state and queue
      if (currentAudioRef && !currentAudioRef.paused) {
        console.log('[Cleanup] Stopping OpenAI TTS audio');
        currentAudioRef.pause();
        currentAudioRef.currentTime = 0;
      }
      currentAudioRef = null;
      isAudioPlaying = false;
      
      // Clear OpenAI TTS queue and reject pending promises
      openAITTSQueue.forEach(item => item.resolve(false));
      openAITTSQueue = [];
      isProcessingOpenAIQueue = false;
      
      // Clear translation cache and queue
      translationCache.current.clear();
      translationRequestQueue.current = [];
      isProcessingTranslations.current = false;
      activeTranslationRequests.current.clear();
      
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
    if (!translationLanguage) return;
    
    const targetLang = getLanguageCode(translationLanguage);
    const langCode = targetLang.split(/[-_]/)[0].toLowerCase();
    
    // If already enabled, just disable
    if (autoSpeakLang === langCode) {
      console.log('[Mobile Play] 🛑 Disabling auto-speak');
      setAutoSpeakLang(null);
      setTtsLoading(false);
      
      // Stop any current speech
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Stop OpenAI TTS audio and clear queue
      if (currentAudioRef && !currentAudioRef.paused) {
        console.log('[Mobile Play] Stopping OpenAI TTS audio');
        currentAudioRef.pause();
        currentAudioRef.currentTime = 0;
        isAudioPlaying = false;
      }
      
      // Clear OpenAI TTS queue
      openAITTSQueue.forEach(item => item.resolve(false));
      openAITTSQueue = [];
      isProcessingOpenAIQueue = false;
      
      // Clear translation cache and queue
      translationCache.current.clear();
      translationRequestQueue.current = [];
      isProcessingTranslations.current = false;
      activeTranslationRequests.current.clear();
      
      window.mobileTtsLock = false;
      return;
    }
    
    // Start loading state
    setTtsLoading(true);
    console.log('[Mobile Play] ⏳ Starting PROFESSIONAL TTS initialization...');
    
    try {
      // Activate audio context immediately during user interaction
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('[Mobile Play] 🔊 Audio context resumed');
        } catch (error) {
          console.warn('[Mobile Play] ⚠️ Audio context failed:', error);
        }
      }
      
      // Enable auto-speak with professional OpenAI TTS
      console.log('[Mobile Play] ▶️ Professional OpenAI TTS ready, enabling auto-speak');
      setAutoSpeakLang(langCode);
      
      // Auto-speak current text if available, or provide feedback
      if (displayedTranslation && displayedTranslation.trim().length >= 10) {
        console.log('[Mobile Play] 🎤 Speaking current text immediately with OpenAI TTS');
        const success = await speakTextMobile(displayedTranslation.trim(), langCode, eventData, audioContextRef);
      } else {
        console.log('[Mobile Play] ✅ OpenAI TTS ready - will speak as content arrives');
      }
      
    } catch (error) {
      console.error('[Mobile Play] ❌ Professional TTS initialization failed:', error);
      setAutoSpeakLang(null);
    } finally {
      // Always clear loading state
      setTtsLoading(false);
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


          </Box>

          {/* Floating Play/Pause Button */}
          <Fab
            onClick={handleMobilePlayToggle}
            disabled={ttsLoading}
            sx={{
              position: "fixed",
              bottom: { xs: 50, sm: 50 }, // Just above the control bar
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: ttsLoading ? "#f5f5f5" : "white",
              color: ttsLoading ? "#8B5CF6" : "#8B5CF6",
              width: { xs: 74, sm: 84 }, // Larger on tablets
              height: { xs: 74, sm: 84 },
              border: "2px solid #8B5CF6", // Purple stroke matching the container
              zIndex: 1001, // Above the control bar
              boxShadow: "0px 4px 20px rgba(139, 92, 246, 0.3)",
              '&:hover': {
                bgcolor: ttsLoading ? "#f5f5f5" : "#f8f9fa",
                boxShadow: "0px 6px 25px rgba(139, 92, 246, 0.4)",
                borderColor: "#8B5CF6" // Keep purple border on hover
              },
              '&:disabled': {
                bgcolor: "#f5f5f5",
                color: "#8B5CF6",
                borderColor: "#8B5CF6",
                opacity: 0.8
              }
            }}
          >
            {ttsLoading ? (
              <CircularProgress 
                size={28} 
                sx={{ 
                  color: "#8B5CF6",
                  fontSize: { xs: 28, sm: 32 }
                }} 
              />
            ) : (
              autoSpeakLang && translationLanguage && autoSpeakLang === getLanguageCode(translationLanguage).split(/[-_]/)[0].toLowerCase() ? 
                <PauseIcon sx={{ fontSize: { xs: 28, sm: 32 } }} /> : 
                <PlayArrowIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            )}
          </Fab>

          {/* TTS Loading Indicator */}
          {ttsLoading && (
            <Box sx={{
              position: "fixed",
              bottom: { xs: 10, sm: 15 }, // Below the floating button
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "rgba(139, 92, 246, 0.9)",
              color: "white",
              px: 2,
              py: 0.5,
              borderRadius: 2,
              fontSize: { xs: "0.75rem", sm: "0.8125rem" },
              fontWeight: 500,
              zIndex: 1002, // Above everything
              whiteSpace: "nowrap"
            }}>
              {!translationLanguage ? 'Loading...' : 
               displayedTranslation && displayedTranslation.trim().length >= 10 ? 
               'Preparing to speak...' : 
               'Setting up TTS...'}
            </Box>
          )}

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
                    
                    {autoSpeakLang && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Button
                          onClick={() => {
                            setAutoSpeakLang(null);
                            
                            // Stop OpenAI TTS audio and clear queue
                            if (currentAudioRef && !currentAudioRef.paused) {
                              console.log('[Stop Auto-TTS] Stopping OpenAI TTS audio');
                              currentAudioRef.pause();
                              currentAudioRef.currentTime = 0;
                              isAudioPlaying = false;
                            }
                            
                            // Clear OpenAI TTS queue
                            openAITTSQueue.forEach(item => item.resolve(false));
                            openAITTSQueue = [];
                            isProcessingOpenAIQueue = false;
                            
                            // Clear translation cache and queue
                            translationCache.current.clear();
                            translationRequestQueue.current = [];
                            isProcessingTranslations.current = false;
                            activeTranslationRequests.current.clear();
                            
                            // Stop mobile TTS if active
                            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                              window.speechSynthesis.cancel();
                            }
                            window.mobileTtsLock = false;
                          }}
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
                                  console.log('[Mobile TTS Button] 🎤 Speaking current text immediately with OpenAI TTS');
                                  const success = await speakTextMobile(displayedTranslation.trim(), langCode, eventData, audioContextRef);
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
                              
                              if (displayedTranslation && displayedTranslation.trim().length >= 10) {
                                // Use debounced TTS for button clicks too
                                debouncedTTS(displayedTranslation.trim(), langCode, eventData);
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
                            debouncedTTS(displayedTranslation.trim(), langCode, eventData);
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