"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Chip from "@mui/material/Chip";

import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import SelfieDoodle from "@/images/illustration/SelfieDoodle";

import io from "socket.io-client";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { DEEPL_LANGUAGES } from '@/utils/deeplLanguages';

// language lookup
const languages = DEEPL_LANGUAGES.map(l => ({
  code: l.azure || l.deepl,
  name: l.name,
  deepl: l.deepl,
  azure: l.azure,
}));

const deepLCodesToNames = {
  EN: 'English',
  DE: 'German',
  ES: 'Spanish',
  FR: 'French',
  IT: 'Italian',
  JA: 'Japanese',
  KO: 'Korean',
  PT: 'Portuguese',
  RU: 'Russian',
  ZH: 'Chinese',
  LV: 'Latvian',
  LT: 'Lithuanian',
  ET: 'Estonian',
  PL: 'Polish',
  NL: 'Dutch',
  CS: 'Czech',
  DA: 'Danish',
  FI: 'Finnish',
  HU: 'Hungarian',
  NB: 'Norwegian',
  RO: 'Romanian',
  SK: 'Slovak',
  SV: 'Swedish',
  TR: 'Turkish',
  UK: 'Ukrainian'
};

const getLanguageName = (code) => {
  if (!code) return "";
  // Try full code first (case-insensitive)
  let found = languages.find(l => l.code.toLowerCase() === code.toLowerCase());
  if (found) return found.name;
  // Try base code (e.g., "en" from "en-US")
  const base = code.split(/[-_]/)[0].toLowerCase();
  found = languages.find(l => l.code.toLowerCase() === base);
  if (found) return found.name;
  // Try DeepL mapping
  if (deepLCodesToNames[code.toUpperCase()]) return deepLCodesToNames[code.toUpperCase()];
  if (deepLCodesToNames[base.toUpperCase()]) return deepLCodesToNames[base.toUpperCase()];
  return code;
};

const getBaseLangCode = (code) => code?.split('-')[0]?.toLowerCase() || code;

const updateEventStatus = async (id, status) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }
  const data = await res.json();
  return data[0];
};

export default function EventLivePage() {
  const { id } = useParams();
  const router = useRouter();

  // event data
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // share‐link dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add this state to track the media recorder and stream
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);

  const socketRef = useRef(null);
  const recognizerRef = useRef(null);

  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchEvent = async () => {
      try {
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
        if (!data || data.length === 0) throw new Error(`Event ${id} not found`);
        setEventData(data[0]);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    // Use the first source language if available
    const sourceLanguage =
      eventData?.sourceLanguage ||
      (Array.isArray(eventData?.sourceLanguages) ? eventData.sourceLanguages[0] : undefined);

    if (!eventData || !sourceLanguage) return;

    console.log("Attempting to connect to socket server...");
    const socket = io("https://speechdev.onrender.com", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected!");

      const startRecognizer = () => {
        if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
          alert("Azure Speech key/region not set");
          return;
        }


        

        const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(
          process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
          process.env.NEXT_PUBLIC_AZURE_REGION
        );
        speechConfig.speechRecognitionLanguage = sourceLanguage;
        (eventData.targetLanguages || []).forEach(lang => {
          speechConfig.addTargetLanguage(lang);
        });

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

        recognizerRef.current = recognizer;

        recognizer.recognizing = (_s, evt) => {
          const text = evt.result.text;
          if (text && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("realtime_transcription", {
              text,
              is_final: false,
              source_language: sourceLanguage,
              room_id: eventData.id,
            });
          }
        };

        recognizer.recognized = (_s, evt) => {
          const text = evt.result.text;
          const translations = evt.result.translations
            ? Object.fromEntries(Object.entries(evt.result.translations))
            : {};
          if (text && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("realtime_transcription", {
              text,
              is_final: true,
              source_language: sourceLanguage,
              room_id: eventData.id,
              translations,
            });
          }
          handleNewTranscription({
            text,
            source_language: sourceLanguage,
            translations,
          });
        };

        recognizer.startContinuousRecognitionAsync(
          () => console.log("Recognition started"),
          err => console.error("Recognition error:", err)
        );
      };

      if (eventData.status === "Live") {
        startRecognizer();
      }
    });

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync(
          () => (recognizerRef.current = null),
          err => {
            console.error("Stop recognition error:", err);
            recognizerRef.current = null;
          }
        );
      }
      socket.close();
    };
    // Add sourceLanguages to dependencies
  }, [eventData?.id, eventData?.sourceLanguage, eventData?.sourceLanguages, eventData?.status]);

  // Fetch audio input devices on mount
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioInputDevices(audioInputs);
        if (!selectedAudioInput && audioInputs.length > 0) {
          setSelectedAudioInput(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    }
    getAudioDevices();
  }, []);

  const handleBackToEvents = () => router.push("/dashboard/analytics");
  const handleOpenShareDialog = () => setShareDialogOpen(true);
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setCopied(false);
  };
  const handleCopyLink = () => {
    const link = `${window.location.origin}/broadcast/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleCompleteEvent = async () => {
    try {
      await updateEventStatus(eventData.id, "Completed");
      setEventData(prev => ({ ...prev, status: "Completed" }));
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("update_event_status", {
          room_id: eventData.id,
          status: "Completed",
        });
      }
      // Redirect to the complete page
      router.push(`/events/${eventData.id}/complete`);
    } catch (e) {
      console.error("Failed to complete event:", e);
    }
  };
  const handlePauseResumeEvent = async () => {
    try {
      const newStatus = eventData.status === "Paused" ? "Live" : "Paused";
      // Update in Supabase
      await updateEventStatus(eventData.id, newStatus);
      setEventData(prev => ({ ...prev, status: newStatus }));

      if (newStatus === "Paused" && recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync(
          () => { recognizerRef.current = null; },
          err => {
            console.error("Stop recognition error:", err);
            recognizerRef.current = null;
          }
        );
      }
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("update_event_status", {
          room_id: eventData.id,
          status: newStatus,
        });
      }
    } catch (e) {
      console.error("Failed to update event status:", e);
    }
  };

  const handleNewTranscription = (data) => {
    // Only record if enabled
    if (eventData.recordEvent) {
      const key = `transcripts_${String(eventData.id)}`;
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
    // ... your existing UI update logic ...
  };

  // Handler for opening/closing the menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handler for selecting a device
  const handleSelectInput = (deviceId) => {
    setSelectedAudioInput(deviceId);
    handleMenuClose();
    // TODO: If you want to re-initialize the recognizer with the new input, do it here
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Event...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!eventData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Event data could not be loaded.</Alert>
        <Button onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  console.log('eventData:', eventData);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: "100vh" }}>
      {/* Header with Back, Pause, Complete */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToEvents}
          sx={{
            color: "#212B36",
            textTransform: "none",
            "&:hover": { bgcolor: "rgba(33, 43, 54, 0.08)" },
          }}
        >
          Back To Events
        </Button>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handlePauseResumeEvent}
            sx={{
              textTransform: "none",
              px: 3,
              py: 1,
              borderRadius: "8px",
            }}
          >
            {eventData?.status === "Paused" ? "Resume Event" : "Pause Event"}
          </Button>
          <Button
            variant="contained"
            onClick={handleCompleteEvent}
            sx={{
              textTransform: "none",
              px: 3,
              py: 1,
              borderRadius: "8px",
            }}
          >
            Complete Event
          </Button>
        </Box>
      </Box>

      {/* Live indicator card */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 2,
          p: 4,
          mb: 4,
          textAlign: "center",
          boxShadow: "0px 2px 4px rgba(145, 158, 171, 0.16)",
        }}
      >
        {/* force exact size & clip any overflow */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 230,
              height: 172,
              overflow: "hidden",
            }}
          >
            <SelfieDoodle
              sx={{
                width: "100%",
                height: "100%",
                fontSize: 0,
              }}
            />
          </Box>
        </Box>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, color: "#212B36", mb: 1 }}
        >
          Your Event Is Live
        </Typography>
        <Typography variant="body2" sx={{ color: "#637381", mb: 2 }}>
          {eventData.description || "Share this link to let people watch the broadcast live."}
        </Typography>
        <Button
          variant="contained"
          onClick={handleOpenShareDialog}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            px: 3,
            py: 1,
          }}
        >
          Share Event
        </Button>
      </Box>

      {/* Published languages card */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 2,
          border: "1px solid #F2F3F5",
          boxShadow: "0px 2px 4px rgba(145, 158, 171, 0.16)",
          mb: 4,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid #F2F3F5",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Published languages
          </Typography>
          {eventData.description && (
            <Typography variant="body2" sx={{ color: "#637381", mt: 0.5 }}>
              {eventData.description}
            </Typography>
          )}
        </Box>

        {/* Source Language Row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderBottom: "1px solid #F2F3F5",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>
              {getLanguageName(eventData.sourceLanguage || (Array.isArray(eventData.sourceLanguages) ? eventData.sourceLanguages[0] : ""))}
            </Typography>
            <Chip label="Source" color="primary" size="small" />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              endIcon={<ArrowDropDownIcon />}
              sx={{ textTransform: "none", fontSize: "14px" }}
              onClick={handleMenuOpen}
            >
              Change Input
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {audioInputDevices.length === 0 ? (
                <MenuItem disabled>No audio inputs found</MenuItem>
              ) : (
                audioInputDevices.map((device) => (
                  <MenuItem
                    key={device.deviceId}
                    selected={device.deviceId === selectedAudioInput}
                    onClick={() => handleSelectInput(device.deviceId)}
                  >
                    {device.label || `Microphone (${device.deviceId})`}
                  </MenuItem>
                ))
              )}
            </Menu>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Target Languages Rows */}
        {eventData.targetLanguages.map((lang) => (
          <Box
            key={lang}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: { xs: 2, sm: 3 },
              py: 1.5,
              borderBottom: "1px solid #F2F3F5",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography>{getLanguageName(getBaseLangCode(lang))}</Typography>
              <Chip label="Translation" color="info" size="small" />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {/* <Button
                size="small"
                endIcon={<ArrowDropDownIcon />}
                sx={{ textTransform: "none", fontSize: "14px" }}
              >
                Change Input
              </Button> */}
              <IconButton size="small">
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Share‐link dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={handleCloseShareDialog}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            width: "400px",
            margin: "0 auto",
            boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.1)",
            overflow: "visible",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Share Event Access
            </Typography>
            <IconButton onClick={handleCloseShareDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            variant="outlined"
            value={`${window.location.origin}/broadcast/${id}`}
            InputProps={{
              readOnly: true,
              sx: {
                borderRadius: "8px",
                bgcolor: "#F9FAFB",
                height: "40px",
                "& .MuiOutlinedInput-input": { p: "10px 14px" },
              },
            }}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" sx={{ color: "#637381", mb: 3 }}>
            Anyone with this link can view the live broadcast.
          </Typography>
          <Button
            variant="contained"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={handleCopyLink}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              px: 3,
              py: 1,
            }}
          >
            {copied ? "Copied!" : "Copy Event Link"}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}