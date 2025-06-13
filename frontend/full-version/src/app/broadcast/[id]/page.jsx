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

export default function BroadcastPage() {
  const { id } = useParams();

  // ── 1) Load event & init langs ─────────────────────────────────────────────
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading]     = useState(true);

  const [availableSourceLanguages, setAvailableSourceLanguages] = useState([]);
  const [availableTargetLanguages, setAvailableTargetLanguages] = useState([]);

  const [transcriptionLanguage, setTranscriptionLanguage] = useState("");
  const [translationLanguage, setTranslationLanguage]     = useState("");

  const [transcriptionMenuAnchor, setTranscriptionMenuAnchor] = useState(null);
  const [translationMenuAnchor, setTranslationMenuAnchor]     = useState(null);

  // ── State: live transcript, translations, history ──────────────────────────
  const [persistedCaptions, setPersistedCaptions] = useState([]);
  const [currentInterimCaption, setCurrentInterimCaption] = useState("");
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState("");
  const [liveTranslations, setLiveTranslations] = useState({}); // For final translations (triggers TTS)
  const [realtimeTranslations, setRealtimeTranslations] = useState({}); // For interim translations (display only)
  const [history, setHistory]                     = useState([]);

  // 1. Add state for auto-TTS language
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);

  // Add a ref for the socket
  const socketRef = useRef(null);

  // State for TTS
  const ttsQueue = useRef([]);
  const currentSynthesizerRef = useRef(null);
  const isSpeaking = useRef(false); // Master lock for TTS

  // Add refs for 3-second TTS chunking - WORD-LEVEL TRACKING
  const ttsChunkInterval = useRef(null);
  const spokenWords = useRef(new Set()); // Track individual words we've spoken
  const wordsToSpeak = useRef([]); // Queue of new words to speak

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
    // Always use langOverride, never fallback to translationLanguage from closure
    const raw = getLanguageCode(langOverride);
    if (!raw) {
      console.warn("No target language set, skipping fallback");
      return out;
    }
    const toCode = raw.split(/[-_]/)[0].toLowerCase();
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ text, to: toCode }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Translate API error:", err);
        return out;
      }
      const { translation } = await res.json();
      out[toCode] = translation;
    } catch (e) {
      console.error("fetchTranslations failed:", e);
    }
    return out;
  };

  // speakText function is now simpler, it just speaks, no locking logic here
  const speakText = useCallback((text, lang, onDone) => {
    // Basic validation
    if (!text || !process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      if (onDone) onDone(false);
      return;
    }

    // Configure and create the synthesizer
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
      process.env.NEXT_PUBLIC_AZURE_REGION
    );
    const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
    
    // Store the synthesizer instance so we can clean up if needed
    currentSynthesizerRef.current = synthesizer;

    console.log(`[TTS] Starting synthesis for: "${text.substring(0, 30)}..."`);

    synthesizer.speakTextAsync(
      text,
      (result) => {
        // This is the main callback when synthesis is done.
        
        const cleanup = () => {
            try { synthesizer.close(); } catch (e) { /* Ignore */ }
            currentSynthesizerRef.current = null;
        };

        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          // THE KEY FIX: Get audio duration from the result.
          // The duration is in 100-nanosecond ticks, so convert to milliseconds.
          const audioDurationMs = result.audioDuration / 10000;
          console.log(`[TTS] Synthesis complete. Audio duration: ${audioDurationMs.toFixed(0)}ms. Waiting for playback to finish.`);
          
          // Wait for the audio to finish playing, then call our onDone callback.
          setTimeout(() => {
            console.log(`[TTS] Playback finished for: "${text.substring(0, 30)}..."`);
            cleanup();
            if (onDone) onDone(true);
          }, audioDurationMs);

        } else {
          // Handle cancellation or other failures immediately.
          console.warn(`[TTS] Synthesis failed or canceled. Reason: ${result.reason}`);
          cleanup();
          if (onDone) onDone(false);
        }
      },
      (error) => {
        // Handle critical errors.
        console.error(`[TTS] Error during synthesis: ${error}`);
        try { synthesizer.close(); } catch (e) { /* Ignore */ }
        currentSynthesizerRef.current = null;
        if (onDone) onDone(false);
      }
    );
  }, []);

  // The single gatekeeper for processing the TTS queue
  const processQueue = useCallback(() => {
    if (isSpeaking.current || ttsQueue.current.length === 0) {
      return; // Exit if already speaking or nothing to speak
    }

    isSpeaking.current = true; // Set the lock

    const item = ttsQueue.current.shift();
    
    speakText(item.text, item.lang, (success) => {
      isSpeaking.current = false; // Release the lock
      
      // After a short, natural pause, try to process the next item
      setTimeout(processQueue, 10); 
    });
  }, [speakText]);

  // Effect for handling new translations - Track individual words
  useEffect(() => {
    if (!autoSpeakLang || !realtimeTranslations[autoSpeakLang]) {
      return;
    }

    const currentText = realtimeTranslations[autoSpeakLang];
    
    // Split into words and filter out already spoken ones
    const currentWords = currentText.toLowerCase().split(/\s+/).filter(word => word.trim());
    const newWords = currentWords.filter(word => !spokenWords.current.has(word));
    
    if (newWords.length > 0) {
      // Add new words to our queue
      wordsToSpeak.current = [...wordsToSpeak.current, ...newWords];
      
      // Mark these words as seen (but not spoken yet)
      newWords.forEach(word => spokenWords.current.add(word));
      
      console.log(`[TTS] New words detected: ${newWords.join(' ')}`);
    }
    
  }, [realtimeTranslations, autoSpeakLang]);

  // Separate effect to handle the 4-second interval for TTS chunks
  useEffect(() => {
    if (!autoSpeakLang) {
      // Clear interval if no auto-speak language
      if (ttsChunkInterval.current) {
        clearInterval(ttsChunkInterval.current);
        ttsChunkInterval.current = null;
      }
      return;
    }

    // Start the 4-second recurring interval - SPEAK QUEUED WORDS
    ttsChunkInterval.current = setInterval(() => {
      if (wordsToSpeak.current.length > 0) {
        const textToSpeak = wordsToSpeak.current.join(' ');
        
        console.log(`[TTS] Speaking queued words: "${textToSpeak}"`);
        
        ttsQueue.current.push({ text: textToSpeak, lang: autoSpeakLang });
        
        // CLEAR the words queue since we've spoken them
        wordsToSpeak.current = [];
        
        // Try to start processing if not already speaking
        if (!isSpeaking.current && ttsQueue.current.length > 0) {
          processQueue();
        }
      }
    }, 4000); // Every 4 seconds, speak queued words

    // Cleanup function for this effect
    return () => {
      if (ttsChunkInterval.current) {
        clearInterval(ttsChunkInterval.current);
        ttsChunkInterval.current = null;
      }
    };
  }, [autoSpeakLang, processQueue]);

  // Cleanup effect - simplified
  useEffect(() => {
    return () => {
      // On unmount, stop any active speech and clear the queue
      if (currentSynthesizerRef.current) {
        try { currentSynthesizerRef.current.close(); } catch(e) {}
        currentSynthesizerRef.current = null;
      }
      if (ttsChunkInterval.current) {
        clearInterval(ttsChunkInterval.current);
        ttsChunkInterval.current = null;
      }
      ttsQueue.current = [];
      isSpeaking.current = false;
      spokenWords.current = new Set();
      wordsToSpeak.current = [];
    };
  }, []);

  // Add effect to reset when auto-speak language changes
  useEffect(() => {
    if (autoSpeakLang) {
      spokenWords.current = new Set();
      wordsToSpeak.current = [];
    }
  }, [autoSpeakLang]);

  // Effect for socket connection and transcription handling
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Broadcast] Socket connected, joining room:", id);
      socket.emit("join_room", { room: id });
    });

    socket.on("realtime_transcription", (data) => {
      setLiveTranscriptionLang(data.source_language || "");

      if (data.is_final) {
        if (data.text && data.text.trim() !== "") {
          setPersistedCaptions(prevCaptions => [
            ...prevCaptions,
            { id: Date.now() + Math.random(), text: data.text, timestamp: Date.now() } 
          ]);
        }
        setCurrentInterimCaption("");
        
        // Trigger translation for final text (this will trigger TTS)
        if (data.text && translationLanguage) {
          fetchTranslations(data.text, translationLanguage).then((translations) => {
            setLiveTranslations(translations); // This triggers TTS
            setRealtimeTranslations(translations); // Update display too
          });
        }
      } else {
        setCurrentInterimCaption(data.text || "");
        
        // REAL-TIME TRANSLATION: Translate interim text for live updates (NO TTS)
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
  }, [id, translationLanguage]);

  // Effect for cleaning up old captions from view
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPersistedCaptions(prevCaptions => {
        const now = Date.now();
        const filtered = prevCaptions.filter(caption => (now - caption.timestamp) < 30000);
        return filtered.length === prevCaptions.length ? prevCaptions : filtered;
      });
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Derived state for the complete displayed caption
  const displayedCaption = useMemo(() => {
    const finalTexts = persistedCaptions.map(c => c.text).join(' ');
    let fullCaption = finalTexts;
    if (currentInterimCaption) {
      fullCaption = finalTexts ? `${finalTexts} ${currentInterimCaption}` : currentInterimCaption;
    }
    return fullCaption.trim();
  }, [persistedCaptions, currentInterimCaption]);

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
      <Box sx={{ flex:1, maxWidth:"1200px", width:"100%", mx:"auto", p:{ xs:2, sm:3 } }}>
        {/* Event Header */}
        <Box sx={{
          mb:3, p:{ xs:2, sm:3 }, borderRadius:2,
          bgcolor:"white", boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5"
        }}>
          <Typography variant="h6" sx={{ fontWeight:600, color:"#212B36", mb:1 }}>
            {eventData.title}
          </Typography>
          <Typography variant="body2" sx={{ color:"#637381" }}>
            {eventData.description}
          </Typography>
        </Box>

        {/* Live Transcription */}
        <Box sx={{
          mb:3, borderRadius:2, bgcolor:"white",
          boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5", overflow:"hidden"
        }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: "1px solid #F2F3F5",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36" }}>
              Live Transcription
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  bgcolor: "#EEF2FF",
                  color: "#6366F1",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {transcriptionLanguage
                  ? getFullLanguageName(getBaseLangCode(transcriptionLanguage))
                  : <span style={{ color: "#ccc" }}>[No language]</span>}
              </Box>
            </Box>
          </Box>
          <Box sx={{ px:{ xs:2, sm:3 }, py:3, minHeight:"200px" }}>
            <Paper elevation={0} sx={{
              p:3, minHeight:"150px", maxHeight:"300px",
              overflowY:"auto",
              borderRadius:"0 0 8px 8px"
            }}>
              <Box sx={{ p:0 }}>
                <Typography variant="body1" sx={{ color: displayedCaption ? "text.primary" : "text.secondary" }}>
                  {displayedCaption || "Waiting for live transcription..."}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Live Translation */}
        <Box sx={{
          mb:3, borderRadius:2, bgcolor:"white",
          boxShadow:"0px 1px 2px rgba(0,0,0,0.06)",
          border:"1px solid #F2F3F5", overflow:"hidden"
        }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: "1px solid #F2F3F5",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36"}}>
              Live Translation
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  bgcolor: "#EEF2FF",
                  color: "#6366F1",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
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
                  fontSize: "14px",
                  color: "#6366F1",
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
          <Box sx={{ px:{ xs:2, sm:3 }, py:3, minHeight:"200px" }}>
            <Paper elevation={0} sx={{
              p:3, minHeight:"150px", maxHeight:"300px",
              overflowY:"auto",
              borderRadius:"0 0 8px 8px"
            }}>
              <Box sx={{ p:0 }}>
                {availableTargetLanguages.length > 0 ? (
                  Object.keys(realtimeTranslations).length > 0 ? (
                    <>
                      {autoSpeakLang && (
                        <Button
                          onClick={() => setAutoSpeakLang(null)}
                          color="secondary"
                          size="small"
                          sx={{ mb: 2, ml: 2 }}
                        >
                          Stop Auto-TTS
                        </Button>
                      )}
                      {Object.entries(realtimeTranslations).map(([lang, txt]) => (
                        <Box key={lang} sx={{ mb:2, display: "flex", alignItems: "center" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:0.5 }}>
                              {getFullLanguageName(getBaseLangCode(lang))}:
                            </Typography>
                            <Typography variant="body1">{txt}</Typography>
                          </Box>
                          <Button
                            onClick={() => setAutoSpeakLang(lang)}
                            sx={{ ml: 2, minWidth: 0 }}
                            aria-label={`Auto-play TTS for ${getFullLanguageName(getBaseLangCode(lang))}`}
                          >
                            <VolumeUpIcon color={autoSpeakLang === lang ? "primary" : "inherit"} />
                          </Button>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <Typography variant="body1" sx={{ color:"text.secondary" }}>
                      Waiting for live translation...
                    </Typography>
                  )
                ) : (
                  <Typography sx={{ color:"#637381", fontStyle:"italic" }}>
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