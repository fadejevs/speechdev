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
const getFullLanguageName = (code = "") => languageMap[code] || code;
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

  const [partialTranslation, setPartialTranslation] = useState({});
  const partialTranslationTimer = useRef(null);
  const lastPartialText = useRef("");

  useEffect(() => {
    const stored = localStorage.getItem("eventData");
    if (stored) {
      const arr = JSON.parse(stored);
      const ev  = arr.find((e) => e.id === id);
      if (ev) {
        setEventData(ev);

        if (ev.sourceLanguages?.length) {
          const fulls = ev.sourceLanguages.map(getFullLanguageName);
          setAvailableSourceLanguages(fulls);
          setTranscriptionLanguage(fulls[0]);
          // lang‐code for live label
          setLiveTranscriptionLang(ev.sourceLanguages[0]);
        }

        if (ev.targetLanguages?.length) {
          const fullt = ev.targetLanguages.map(getFullLanguageName);
          setAvailableTargetLanguages(fullt);
          setTranslationLanguage(fullt[0]);
        }

        if (ev.status === "Paused" || ev.status === "Completed") {
          stopListening();
        } else {
          startListening();
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!eventData) return;
    if (eventData.status === "paused" || eventData.status === "completed") {
      stopListening();
      return;
    }
    // Request mic permission and start listening
    const start = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (err) {
        alert("Microphone access is required to join this broadcast.");
      }
    };
    start();
    return () => stopListening();
  }, [eventData]);

  // ── State: live transcript, translations, history ──────────────────────────
  const [liveTranscription, setLiveTranscription] = useState("");
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState("");
  const [liveTranslations, setLiveTranslations]   = useState({});
  const [history, setHistory]                     = useState([]);

  // ── Azure recognizer ref + listening flag ─────────────────────────────────
  const recognizerRef = useRef(null);
  const [listening, setListening] = useState(false);

  // ── Audio‐input device selection ──────────────────────────────
  const [audioInputs, setAudioInputs] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [audioMenuAnchor, setAudioMenuAnchor] = useState(null);

  // Add state for currently playing audio
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioInputs(inputs);
        if (inputs[0]) setSelectedAudioInput(inputs[0].deviceId);
      })
      .catch((err) => console.error("enumerateDevices failed:", err));
  }, []);

  const handleAudioMenuOpen = (e) => setAudioMenuAnchor(e.currentTarget);
  const handleAudioMenuClose = () => setAudioMenuAnchor(null);
  const handleAudioSelect = (deviceId) => {
    setSelectedAudioInput(deviceId);
    handleAudioMenuClose();
  };

  // unpack Azure PropertyCollection → plain object
  const toPlain = (raw) => {
    if (!raw?.privKeys?.length) return {};
    return raw.privKeys.reduce((acc, k, i) => {
      acc[k] = raw.privValues[i];
      return acc;
    }, {});
  };

  // fallback via your /api/translate route
  const fetchTranslations = async (text) => {
    const out = {};
    const raw = getLanguageCode(translationLanguage);
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

  // Handler to play TTS for a translation
  const handlePlayTTS = async (text, lang) => {
    try {
      // Debug: log what is being sent
      console.log("Requesting TTS for:", { text, lang });

      const audioBlob = await apiService.synthesizeSpeech(text, lang);

      // Debug: check the blob type
      console.log("Received blob:", audioBlob);

      // If the blob is not audio, try to read it as text (error from backend)
      if (!audioBlob || audioBlob.type.indexOf("audio") === -1) {
        const errorText = await audioBlob.text();
        console.error("TTS backend error:", errorText);
        alert("TTS failed: " + errorText);
        return;
      }

      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Play the audio
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error("TTS failed:", err);
      alert("TTS failed: " + err.message);
    }
  };

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

    // Log the text to be sure
    console.log("TTS input text:", text);

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

  // ── Start / Stop handlers ──────────────────────────────────────────────────
  const startListening = () => {
    if (!eventData || !transcriptionLanguage || !translationLanguage) return;

    const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
      process.env.NEXT_PUBLIC_AZURE_REGION
    );
    const srcCode = getLanguageCode(transcriptionLanguage);
    speechConfig.speechRecognitionLanguage = srcCode;
    setLiveTranscriptionLang(srcCode);

    const tgtCode = getLanguageCode(translationLanguage);
    speechConfig.addTargetLanguage(tgtCode);

    const audioConfig =
      selectedAudioInput
        ? SpeechSDK.AudioConfig.fromMicrophoneInput(selectedAudioInput)
        : SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer  = new SpeechSDK.TranslationRecognizer(
      speechConfig,
      audioConfig
    );

    recognizer.recognizing = async (_s, evt) => {
      const txt = evt.result.text || "";
      setLiveTranscription(txt);
      setLiveTranscriptionLang(srcCode);

      // Only translate if text changed and not empty
      if (txt && txt !== lastPartialText.current) {
        lastPartialText.current = txt;

        // Throttle: only translate every 5 seconds
        if (!partialTranslationTimer.current) {
          partialTranslationTimer.current = setTimeout(async () => {
            const plain = await fetchTranslations(txt);
            setPartialTranslation(plain);
            partialTranslationTimer.current = null;
          }, 5000);
        }
      }
    };

    recognizer.recognized = async (_s, evt) => {
      const txt = evt.result.text || "";
      let plain = toPlain(evt.result.translations);
      if (!Object.keys(plain).length && txt.trim()) {
        plain = await fetchTranslations(txt);
      }
      setLiveTranscription(txt);
      setLiveTranslations(plain);
      setHistory((h) => [...h, { text: txt, translations: plain }]);
      setPartialTranslation({}); // Clear partial translation

      // Clear any pending timer
      if (partialTranslationTimer.current) {
        clearTimeout(partialTranslationTimer.current);
        partialTranslationTimer.current = null;
      }
      lastPartialText.current = "";
    };

    recognizer.sessionStopped = () => {
      setListening(false);
      recognizerRef.current = null;
    };

    recognizer.startContinuousRecognitionAsync(
      () => setListening(true),
      (err) => console.error("Azure start error:", err)
    );
    recognizerRef.current = recognizer;
  };

  const stopListening = () => {
    const rec = recognizerRef.current;
    if (!rec) return;
    rec.stopContinuousRecognitionAsync(
      () => {
        setListening(false);
        recognizerRef.current = null;
      },
      (err) => console.error("Azure stop error:", err)
    );
  };

  // Add this download handler function inside your component:
  const handleDownloadSession = () => {
    if (!history.length) {
      alert("No session history to download.");
      return;
    }
    let content = "";
    history.forEach((entry, i) => {
      content += `Segment ${i + 1}:\n`;
      content += `Original: ${entry.text}\n`;
      Object.entries(entry.translations).forEach(([lang, txt]) => {
        content += `  [${lang}]: ${txt}\n`;
      });
      content += "\n";
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "session_transcript.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add this for debugging:
  console.log("LiveTranslations keys:", Object.keys(liveTranslations));
  console.log("PartialTranslation keys:", Object.keys(partialTranslation));

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
                {getFullLanguageName(getBaseLangCode(liveTranscriptionLang))}
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
                {getFullLanguageName(getBaseLangCode(translationLanguage))}
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
                      // If listening, restart recognizer to apply new target language
                      if (listening) {
                        stopListening();
                        setTimeout(startListening, 300);
                      }
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
                Object.entries(liveTranslations).map(([lang, txt]) => (
                  <Box key={lang} sx={{ mb:2, display: "flex", alignItems: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight:600, mb:0.5 }}>
                        {getFullLanguageName(getBaseLangCode(lang))}:
                      </Typography>
                      <Typography variant="body1">{txt}</Typography>
                    </Box>
                    <Button
                      onClick={() => speakText(txt, lang)}
                      sx={{ ml: 2, minWidth: 0 }}
                      aria-label={`Listen to ${getFullLanguageName(getBaseLangCode(lang))}`}
                    >
                      <VolumeUpIcon />
                    </Button>
                  </Box>
                ))
              ) : Object.keys(partialTranslation).length > 0 ? (
                Object.entries(partialTranslation).map(([lang, txt]) => (
                  <Box key={lang} sx={{ mb:2, display: "flex", alignItems: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight:600, mb:0.5 }}>
                        {getFullLanguageName(getBaseLangCode(lang))} (partial):
                      </Typography>
                      <Typography variant="body1">{txt}</Typography>
                    </Box>
                  </Box>
                ))
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

        {/* Add this button where you want users to download the session (e.g., above or below your main content): */}
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleDownloadSession}>
            Download Session Transcript
          </Button>
        </Box>
      </Box>
    </Box>
  );
}