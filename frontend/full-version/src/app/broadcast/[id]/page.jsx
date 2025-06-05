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
  const [liveTranslations, setLiveTranslations]   = useState({});
  const [history, setHistory]                     = useState([]);

  // 1. Add state for auto-TTS language
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);

  // Add a ref for the socket
  const socketRef = useRef(null);

  // Add these at the top of your component
  const ttsQueue = useRef([]);
  const ttsBusy = useRef(false);
  const currentSynthesizerRef = useRef(null); // Ref for the current speech synthesizer

  // Add refs for batching translations
  const translationBatch = useRef([]);
  const batchTimer = useRef(null);
  const BATCH_INTERVAL = 1000; // Reduced to 2 seconds for more real-time feel

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

  // speakText function (memoized)
  const speakText = useCallback((text, lang, onDone) => {
    if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      alert("Azure Speech key/region not set. Please configure environment variables.");
      if (onDone) onDone(false); // Indicate failure
      return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
      process.env.NEXT_PUBLIC_AZURE_REGION
    );

    const voice = voiceMap[lang] || voiceMap['en'] || 'en-US-JennyNeural';
    speechConfig.speechSynthesisVoiceName = voice;

    console.log(`[TTS] Attempting to speak: "${text.substring(0,30)}..." in language "${lang}" using voice "${voice}"`);

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
    currentSynthesizerRef.current = synthesizer; // Store the current synthesizer

    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          console.log(`[TTS] Synthesis completed for "${text.substring(0,30)}..."`);
        } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
          const cancellation = SpeechSDK.SpeechSynthesisCancellationDetails.fromResult(result);
          console.warn(`[TTS] CANCELED: Reason=${cancellation.reason} for "${text.substring(0,30)}..."`);
          // This often happens upon interruption by synthesizer.close()
        }
        try {
          synthesizer.close();
        } catch (closeError) {
          console.error("[TTS] Error closing synthesizer on completion/cancel:", closeError);
        }
        // Only clear the ref if this synthesizer is still the current one
        if (currentSynthesizerRef.current === synthesizer) {
          currentSynthesizerRef.current = null;
        }
        if (onDone) onDone(true); // Indicate success or normal cancellation
      },
      (error) => {
        console.error(`[TTS] Error for text "${text.substring(0,30)}...", lang "${lang}": `, error);
        try {
          synthesizer.close();
        } catch (closeError) {
          console.error("[TTS] Error closing synthesizer on error:", closeError);
        }
        if (currentSynthesizerRef.current === synthesizer) {
          currentSynthesizerRef.current = null;
        }
        if (onDone) onDone(false); // Indicate failure
      }
    );
  }, []); // voiceMap is stable

  // processTTSQueue function (memoized)
  const processTTSQueue = useCallback(() => {
    if (ttsBusy.current || ttsQueue.current.length === 0) {
      return;
    }
    
    ttsBusy.current = true;
    // Ensure item exists before trying to shift (though length check should cover)
    const itemToSpeak = ttsQueue.current.shift();
    
    if (!itemToSpeak) { // Should not happen if length > 0
        ttsBusy.current = false;
        return;
    }

    const { text, lang } = itemToSpeak;
    
    console.log("[Broadcast] Processing TTS queue. Next item:", {
      text: text.substring(0, 50) + "..."
    });
    
    speakText(text, lang, (/*success*/) => {
      // Note: currentSynthesizerRef is handled by speakText callbacks now
      ttsBusy.current = false;
      if (autoSpeakLang !== null) { 
        processTTSQueue(); // Attempt to process next item if TTS still active
      }
    });
  }, [speakText, autoSpeakLang]);

  // processBatchedTranslations function (memoized)
  const processBatchedTranslations = useCallback(() => {
    if (translationBatch.current.length === 0 || !autoSpeakLang) {
      return;
    }

    const batchedText = translationBatch.current.join(' ');
    const currentBatchSize = translationBatch.current.length;
    translationBatch.current = []; // Clear batch

    console.log("[Broadcast] Batch ready for TTS:", {
      batchSize: currentBatchSize,
      text: batchedText.substring(0, 100) + "..."
    });
    
    if (batchedText.trim()) {
      // --- Interruption Logic ---
      if (ttsBusy.current && currentSynthesizerRef.current) {
        console.log("[TTS] Interruption: stopping previous speech for new batch.");
        currentSynthesizerRef.current.close(); // This will trigger the onDone of the ongoing speakText
        // currentSynthesizerRef.current will be set to null by the speakText callback
        // ttsBusy.current will be set to false by the speakText callback, allowing the new item to be picked up
      }
      // It's important that the old speakText finishes its callbacks (setting ttsBusy false)
      // before the new one is processed. A small timeout can ensure this if races occur.
      // However, the speakText callback itself calls processTTSQueue, which will pick up the new item.

      ttsQueue.current = [{ text: batchedText, lang: autoSpeakLang }]; // Replace queue with new single batch
      
      // If not busy, processTTSQueue can start immediately.
      // If it was busy, the interrupted speakText's callback will set ttsBusy to false
      // and then call processTTSQueue, which will find the new item.
      if (!ttsBusy.current) {
         processTTSQueue();
      }
    }
  }, [autoSpeakLang, processTTSQueue]);

  // Effect for batching translations and triggering TTS
  useEffect(() => {
    let isMounted = true;

    if (autoSpeakLang && liveTranslations[autoSpeakLang]) {
      translationBatch.current.push(liveTranslations[autoSpeakLang]);
      
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
      
      batchTimer.current = setTimeout(() => {
        if (isMounted) {
          processBatchedTranslations();
        }
      }, BATCH_INTERVAL);
    }
    
    return () => { // Cleanup function
      isMounted = false;
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
        batchTimer.current = null;
      }
      
      console.log(`[Broadcast] TTS Batching Effect cleanup (lang: ${autoSpeakLang}). Clearing batch, TTS queue, and stopping speech.`);
      translationBatch.current = [];
      
      if (ttsBusy.current && currentSynthesizerRef.current) {
        console.log("[TTS Cleanup] Stopping active speech.");
        currentSynthesizerRef.current.close();
        currentSynthesizerRef.current = null; // Explicitly clear here for cleanup
      }
      ttsQueue.current = [];
      ttsBusy.current = false; // Reset busy state on cleanup
    };
  }, [liveTranslations, autoSpeakLang, processBatchedTranslations, BATCH_INTERVAL]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket; // Store socket in ref

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
        setCurrentInterimCaption(""); // Clear interim once final arrives
      } else {
        setCurrentInterimCaption(data.text || "");
      }

      // --- Only save if recordEvent is enabled for this event ---
      // Note: This currently saves both interim and final to local storage.
      // To save only final, add 'data.is_final &&' to the condition.
      const storedEvents = localStorage.getItem("eventData");
      let shouldRecord = false;
      if (storedEvents) {
        const arr = JSON.parse(storedEvents);
        const ev = arr.find((e) => String(e.id) === String(id));
        if (ev && ev.recordEvent) {
          shouldRecord = true;
        }
      }

      if (shouldRecord) {
        const key = `transcripts_${String(id)}`;
        const transcripts = JSON.parse(localStorage.getItem(key) || '{}');

        // Save source transcription
        if (data.text && data.source_language) {
          const lang = data.source_language.split('-')[0].toLowerCase();
          transcripts[lang] = transcripts[lang] || [];
          transcripts[lang].push(data.text);
        }
        // Save translations
        if (data.translations) {
          Object.entries(data.translations).forEach(([lang, txt]) => {
            const baseLang = lang.split('-')[0].toLowerCase();
            transcripts[baseLang] = transcripts[baseLang] || [];
            transcripts[baseLang].push(txt);
          });
        }
        localStorage.setItem(key, JSON.stringify(transcripts));
      }

      // Trigger translation in the browser
      if (data.text && translationLanguage) {
        fetchTranslations(data.text, translationLanguage).then((plain) => {
          setLiveTranslations(plain);
        });
      }
    });

    // --- Add this listener for event status updates ---
    socket.on("event_status_update", (data) => {
      if (data.room_id === id && ["Paused", "Completed", "Live"].includes(data.status)) { // Check room_id
        console.log("[Broadcast] Event status update received:", data);
        setEventData((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      console.log("[Broadcast] Cleaning up socket connection for room:", id);
      if (socketRef.current) {
        socketRef.current.emit("leave_room", { room: id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, translationLanguage]); // Removed autoSpeakLang from this specific socket useEffect
                                 // as it's mainly for socket setup and transcription receiving.
                                 // TTS logic is handled by its own useEffect.

  // Effect for cleaning up persisted captions
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPersistedCaptions(prevCaptions => {
        const now = Date.now();
        const filtered = prevCaptions.filter(caption => (now - caption.timestamp) < 30000); // 30 seconds
        if (filtered.length !== prevCaptions.length) {
          return filtered;
        }
        return prevCaptions;
      });
    }, 5000); // Cleanup check interval: 5 seconds

    return () => clearInterval(intervalId);
  }, []); // Runs once on mount

  // Derived state for displayed caption
  const displayedCaption = useMemo(() => {
    const finalTexts = persistedCaptions.map(c => c.text).join(' ');
    // Append interim caption. If finalTexts is empty, interim will be shown alone.
    // If both are empty, result is empty string.
    let fullCaption = finalTexts;
    if (currentInterimCaption) {
      fullCaption = finalTexts ? `${finalTexts} ${currentInterimCaption}` : currentInterimCaption;
    }
    return fullCaption.trim(); // Trim to handle potential leading/trailing spaces
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
              {/* <Button
                size="small"
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setTranscriptionMenuAnchor(e.currentTarget)}
                sx={{
                  textTransform: "none",
                  fontSize: "14px",
                  color: "#6366F1",
                }}
              >
                Change Language
              </Button> */}
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
                  Object.keys(liveTranslations).length > 0 ? (
                    <>
                      {/* 3. Add Stop Auto-TTS button if enabled */}
                      {autoSpeakLang && (
                        <Button
                          onClick={() => setAutoSpeakLang(null)}
                          color="secondary"
                          size="small"
                          sx={{ mb: 2 }}
                        >
                          Stop Auto-TTS
                        </Button>
                      )}
                      {Object.entries(liveTranslations).map(([lang, txt]) => (
                        <Box key={lang} sx={{ mb:2, display: "flex", alignItems: "center" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:0.5 }}>
                              {getFullLanguageName(getBaseLangCode(lang))}:
                            </Typography>
                            <Typography variant="body1">{txt}</Typography>
                          </Box>
                          {/* 4. TTS button: set auto-TTS for this language */}
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