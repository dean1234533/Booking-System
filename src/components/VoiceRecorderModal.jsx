import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import {
  startRecording,
  stopRecording,
  isSpeechRecognitionSupported,
} from "../utils/voiceToText";
import { categorizeTranscript, getCategoryColor } from "../utils/categorizationEngine";

/**
 * Voice Recorder Modal
 * Records consultation, transcribes with Web Speech API, auto-categorizes
 */
export default function VoiceRecorderModal({ open, onClose, onSave }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [error, setError] = useState("");
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef(null);

  const handleStartRecording = () => {
    if (!isSpeechRecognitionSupported()) {
      setError("Speech Recognition not supported in this browser");
      setBrowserSupported(false);
      return;
    }

    setError("");
    setTranscript("");
    setInterimTranscript("");
    setSuggestedCategories([]);
    setSelectedCategories([]);

    const recognition = startRecording(
      (current, final) => {
        setInterimTranscript(current.substring(final.length));
        setTranscript(final);
      },
      (errorMsg) => {
        setError(errorMsg);
        setIsRecording(false);
      },
      () => {
        setIsRecording(true);
      },
      (finalText) => {
        // When recording ends, auto-categorize
        const categories = categorizeTranscript(finalText);
        setSuggestedCategories(categories);
      }
    );

    recognitionRef.current = recognition;
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      stopRecording(recognitionRef.current);
      recognitionRef.current = null;
      setIsRecording(false);

      // Auto-categorize after stopping
      const categories = categorizeTranscript(transcript);
      setSuggestedCategories(categories);
      setSelectedCategories(categories);
    }
  };

  const handleToggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      setError("Please record something before saving");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        transcript: transcript.trim(),
        categories: selectedCategories,
        duration: Math.round(transcript.split(" ").length / 120), // Rough estimate: 120 words per minute
        timestamp: new Date().toISOString(),
      });

      // Reset form
      setTranscript("");
      setInterimTranscript("");
      setSuggestedCategories([]);
      setSelectedCategories([]);
      setError("");
      onClose();
    } catch (err) {
      setError("Failed to save consultation: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setTranscript("");
    setInterimTranscript("");
    setSuggestedCategories([]);
    setSelectedCategories([]);
    setError("");
    setBrowserSupported(true);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Consultation</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {!browserSupported && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Your browser doesn't support voice recording. Please use Chrome,
            Safari, Edge, or a modern mobile browser.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Recording Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
            p: 2,
            bgcolor: isRecording ? "#ffe6e6" : "#f5f5f5",
            borderRadius: 1,
          }}
        >
          {isRecording && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "#FF6B6B",
                animation: "pulse 1.5s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
              }}
            />
          )}
          <Typography variant="body2" sx={{ flex: 1 }}>
            {isRecording ? "Recording..." : "Ready to record"}
          </Typography>
        </Box>

        {/* Recording Controls */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            color={isRecording ? "error" : "primary"}
            startIcon={isRecording ? <StopIcon /> : <MicIcon />}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            fullWidth
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        </Box>

        {/* Live Transcript */}
        {(transcript || interimTranscript) && (
          <TextField
            multiline
            rows={6}
            fullWidth
            value={transcript + interimTranscript}
            readOnly
            label="Live Transcript"
            variant="outlined"
            sx={{ mb: 2 }}
          />
        )}

        {/* Suggested Categories */}
        {suggestedCategories.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Suggested Categories
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {suggestedCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => handleToggleCategory(category)}
                  variant={
                    selectedCategories.includes(category)
                      ? "filled"
                      : "outlined"
                  }
                  sx={{
                    bgcolor: selectedCategories.includes(category)
                      ? getCategoryColor(category)
                      : "transparent",
                    color: selectedCategories.includes(category)
                      ? "white"
                      : "inherit",
                    borderColor: getCategoryColor(category),
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      opacity: 0.8,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Additional Notes */}
        <TextField
          multiline
          rows={3}
          fullWidth
          placeholder="Add any additional notes (optional)"
          variant="outlined"
          label="Additional Notes"
          sx={{ mb: 2 }}
          disabled={isSaving}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!transcript.trim() || isSaving}
          endIcon={isSaving && <CircularProgress size={20} />}
        >
          Save Consultation
        </Button>
      </DialogActions>
    </Dialog>
  );
}
