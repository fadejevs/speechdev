"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [liveTranscription, setLiveTranscription] = useState("");
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState("");
  const [liveTranslations, setLiveTranslations]   = useState({});
  const [history, setHistory]                     = useState([]);

  // 1. Add state for auto-TTS language
  const [autoSpeakLang, setAutoSpeakLang] = useState(null);

  // Add a ref for the socket
  const socketRef = useRef(null);

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

  // Add this function for TTS (using your API or Azure)
  const speakText = (text, lang = "en-US") => {
    if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
      alert("Azure Speech key/region not set");
      return;
    }
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
      process.env.NEXT_PUBLIC_AZURE_REGION
    );
    // Normalize and map the language to a voice
    const normalizedLang = lang.toLowerCase();
    const voiceName = voiceMap[normalizedLang] || "en-US-JennyNeural";
    speechConfig.speechSynthesisVoiceName = voiceName;

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
      text,
      result => {
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          console.log("Speech synthesized for text: " + text);
        } else {
          console.error("Speech synthesis canceled, " + result.errorDetails);
        }
        synthesizer.close();
      },
      error => {
        console.error(error);
        synthesizer.close();
      }
    );
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("join_room", { room: id });
    });

    socket.on("realtime_transcription", (data) => {
      setLiveTranscription(data.text || "");
      setLiveTranscriptionLang(data.source_language || "");

      // --- Only save if recordEvent is enabled for this event ---
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

          // 2. Auto-TTS logic: play TTS for new translations if enabled
          if (autoSpeakLang && plain[autoSpeakLang]) {
            speakText(plain[autoSpeakLang], autoSpeakLang);
          }
        });
      }
    });

    // --- Add this listener for event status updates ---
    socket.on("event_status_update", (data) => {
      if (["Paused", "Completed", "Live"].includes(data.status)) {
        setEventData((prev) => ({
          ...prev,
          status: data.status,
        }));
      }
    });

    return () => {
      socket.emit("leave_room", { room: id });
      socket.disconnect();
    };
  }, [id, translationLanguage, autoSpeakLang]);

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

  if (eventData && (eventData.status === "Paused" || eventData.status === "Completed")) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <Box component="header" sx={{
          display: "flex", alignItems: "center", height: 64,
          px: 2, borderBottom: "1px solid #f0f0f0",
          backgroundColor: "background.default"
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Typography variant="h5" sx={{
              fontWeight: 600, color: "#6366F1", letterSpacing: "-0.5px"
            }}>
              interpretd
            </Typography>
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
        <Link href="/" style={{ textDecoration:"none" }}>
          <Typography variant="h5" sx={{
            fontWeight:600, color:"#6366F1", letterSpacing:"-0.5px"
          }}>
            interpretd
          </Typography>
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
              p:2, minHeight:"150px", maxHeight:"300px",
              overflowY:"auto", bgcolor:"#F9FAFB",
              borderRadius:"0 0 8px 8px"
            }}>
              <Box sx={{ p:3 }}>
                {liveTranscription ? (
                  <Typography variant="body1">{liveTranscription}</Typography>
                ) : (
                  <Typography variant="body1" sx={{ color:"text.secondary", fontStyle:"italic" }}>
                    Waiting for live transcription...
                  </Typography>
                )}
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
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212B36" }}>
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
                <Typography variant="body1" sx={{ color:"text.secondary", fontStyle:"italic" }}>
                  Waiting for live translation...
                </Typography>
              )
            ) : (
              <Typography sx={{ color:"#637381", fontStyle:"italic" }}>
                No target languages configured for this event.
              </Typography>
            )}
          </Box>
        </Box>

        {/* <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={() => {
            // handleDownloadSession();
          }}>
            Download Session Transcript
          </Button>
        </Box> */}
      </Box>
    </Box>
  );
}