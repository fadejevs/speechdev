"use client";

import React, { useState, useEffect } from "react";
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

import SelfieDoodle from "@/images/illustration/SelfieDoodle";

// language lookup
const languages = [
  { code: "en", name: "English" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "et", name: "Estonian" },
  { code: "ru", name: "Russian" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
];
const getFullLanguageName = (code) => {
  const found = languages.find((l) => l.code === code);
  return found ? found.name : code;
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const raw = localStorage.getItem("eventData");
      if (!raw) throw new Error("No event data in localStorage");
      const allEvents = JSON.parse(raw);
      const found = allEvents.find((e) => e.id.toString() === id.toString());
      if (!found) throw new Error(`Event ${id} not found`);

      const mapped = {
        id: found.id,
        name: found.title || found.name || `Event ${found.id}`,
        description: found.description || "",
        location: found.location || "",
        date: found.date || found.timestamp || "",
        type: found.type || "",
        sourceLanguage:
          found.sourceLanguage ||
          (Array.isArray(found.sourceLanguages)
            ? found.sourceLanguages[0]
            : ""),
        targetLanguages: found.targetLanguages || [],
      };

      setEventData(mapped);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
  const handleCompleteEvent = () => {
    try {
      const raw = localStorage.getItem("eventData") || "[]";
      const all = JSON.parse(raw);
      const updated = all.map((e) =>
        e.id === eventData.id ? { ...e, status: "Completed" } : e
      );
      localStorage.setItem("eventData", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update event status:", e);
    }
    router.push(`/events/${id}/complete`);
  };
  const handlePauseEvent = () => {
    // stub: disable for now
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
            onClick={handlePauseEvent}
            disabled
            sx={{
              textTransform: "none",
              px: 3,
              py: 1,
              borderRadius: "8px",
            }}
          >
            Pause Event
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
            <Typography>{getFullLanguageName(eventData.sourceLanguage)}</Typography>
            <Chip label="Source" color="primary" size="small" />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              endIcon={<ArrowDropDownIcon />}
              sx={{ textTransform: "none", fontSize: "14px" }}
            >
              Change Input
            </Button>
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
              <Typography>{getFullLanguageName(lang)}</Typography>
              <Chip label="Translation" color="info" size="small" />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                size="small"
                endIcon={<ArrowDropDownIcon />}
                sx={{ textTransform: "none", fontSize: "14px" }}
              >
                Change Input
              </Button>
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