import React, { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField, Typography, CircularProgress, Alert, IconButton,
} from "@mui/material";
import MicIcon       from "@mui/icons-material/Mic";
import StopIcon      from "@mui/icons-material/Stop";
import DeleteIcon    from "@mui/icons-material/Delete";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceRecorderModal({ open, onClose, onSave, trainerId, clientId }) {
  const [phase,      setPhase]      = useState("idle");
  const [elapsed,    setElapsed]    = useState(0);
  const [audioUrl,   setAudioUrl]   = useState(null);
  const [transcript, setTranscript] = useState("");
  const [interim,    setInterim]    = useState("");
  const [notes,      setNotes]      = useState("");
  const [error,      setError]      = useState("");
  const [speechInfo, setSpeechInfo] = useState("");

  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const streamRef    = useRef(null);
  const blobRef      = useRef(null);
  const mimeRef      = useRef("");
  const recognRef    = useRef(null);
  const finalTextRef = useRef("");
  const shouldRecRef = useRef(false);

  useEffect(() => { if (!open) reset(); }, [open]);

  function reset() {
    stopTimer();
    shouldRecRef.current = false;
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch {}
    }
    if (recognRef.current) { try { recognRef.current.abort(); } catch {} recognRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    chunksRef.current    = [];
    blobRef.current      = null;
    finalTextRef.current = "";
    mediaRecRef.current  = null;
    mimeRef.current      = "";
    setPhase("idle"); setElapsed(0); setAudioUrl(null);
    setTranscript(""); setInterim(""); setNotes("");
    setError(""); setSpeechInfo("");
  }

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }
  function stopTimer() { clearInterval(timerRef.current); timerRef.current = null; }

  // ── SpeechRecognition ────────────────────────────────────────────────────
  function buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous     = true;
    r.interimResults = true;
    r.lang           = navigator.language || "en-US";
    r.onresult = e => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTextRef.current += t + " ";
        else tmp += t;
      }
      setTranscript(finalTextRef.current);
      setInterim(tmp);
    };
    r.onerror = e => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setSpeechInfo(`Transcription error: ${e.error}`);
      }
    };
    r.onend = () => {
      setInterim("");
      if (shouldRecRef.current) {
        // auto-restart while still recording
        try {
          const r2 = buildRecognition();
          if (r2) { recognRef.current = r2; r2.start(); }
        } catch {}
      }
    };
    return r;
  }

  // ── Main recording ────────────────────────────────────────────────────────
  async function startRecording() {
    setError(""); setSpeechInfo("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported format
      const formats = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mime = formats.find(f => {
        try { return MediaRecorder.isTypeSupported(f); } catch { return false; }
      }) || "";
      mimeRef.current = mime;

      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const actualMime = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setTranscript(finalTextRef.current.trim());
        setPhase("recorded");
        stopTimer();
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      rec.start(250);
      shouldRecRef.current = true;
      setPhase("recording");
      startTimer();

      // Start speech recognition in parallel
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        try {
          const recog = buildRecognition();
          recognRef.current = recog;
          recog.start();
          setSpeechInfo("Transcription active");
        } catch (err) {
          setSpeechInfo("Transcription unavailable");
        }
      } else {
        setSpeechInfo("Live transcription requires Chrome or Edge");
      }
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please click the lock icon in your browser and allow microphone access."
          : "Could not access microphone: " + err.message
      );
    }
  }

  function stopRecording() {
    shouldRecRef.current = false;
    if (recognRef.current) { try { recognRef.current.stop(); } catch {} recognRef.current = null; }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    stopTimer();
  }

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    blobRef.current = null; finalTextRef.current = "";
    setAudioUrl(null); setTranscript(""); setElapsed(0); setPhase("idle"); setSpeechInfo("");
  }

  async function handleSave() {
    if (!blobRef.current) { setError("Nothing recorded yet."); return; }
    if (blobRef.current.size === 0) { setError("Recording appears to be empty — please try again."); return; }
    setPhase("saving"); setError("");
    try {
      const ext      = mimeRef.current.includes("mp4") ? "mp4" : mimeRef.current.includes("ogg") ? "ogg" : "webm";
      const fileName = `barbers/${trainerId}/recordings/${clientId || "general"}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blobRef.current);
      const downloadUrl = await getDownloadURL(storageRef);

      await onSave({
        audioUrl:   downloadUrl,
        transcript: transcript.trim(),
        notes:      notes.trim(),
        duration:   elapsed,
        timestamp:  new Date().toISOString(),
      });

      reset(); onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save: " + err.message);
      setPhase("recorded");
    }
  }

  function handleClose() { reset(); onClose(); }

  const isRecording = phase === "recording";
  const isRecorded  = phase === "recorded";
  const isSaving    = phase === "saving";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Record Voice Note</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Status bar */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5, mb: 2, p: 2,
          bgcolor: isRecording ? "#fff0f0" : isRecorded ? "#f0fff4" : "#f5f5f5",
          border: "1px solid",
          borderColor: isRecording ? "#ffcccc" : isRecorded ? "#c8f0d4" : "#e0e0e0",
          borderRadius: "10px",
        }}>
          {isRecording && (
            <Box sx={{
              width: 10, height: 10, borderRadius: "50%", bgcolor: "#e53935", flexShrink: 0,
              animation: "recpulse 1.2s ease-in-out infinite",
              "@keyframes recpulse": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.45, transform: "scale(0.8)" } },
            }} />
          )}
          <Typography sx={{ flex: 1, fontSize: "0.88rem", fontWeight: 600,
            color: isRecording ? "#c62828" : isRecorded ? "#2e7d32" : "text.secondary" }}>
            {isRecording ? "Recording…" : isRecorded ? "Recording complete" : "Ready to record"}
          </Typography>
          <Typography sx={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700,
            color: isRecording ? "#c62828" : "text.secondary" }}>
            {formatTime(elapsed)}
          </Typography>
        </Box>

        {/* Speech info chip */}
        {isRecording && speechInfo && (
          <Typography sx={{ fontSize: "0.75rem", color: "text.disabled", mb: 1.5 }}>
            {speechInfo}
          </Typography>
        )}

        {/* Start / Stop button */}
        {!isRecorded && !isSaving && (
          <Button fullWidth variant="contained" size="large"
            startIcon={isRecording ? <StopIcon /> : <MicIcon />}
            onClick={isRecording ? stopRecording : startRecording}
            sx={{
              mb: 2, height: 52, borderRadius: "10px", fontWeight: 700, fontSize: "0.95rem",
              bgcolor: isRecording ? "#e53935" : "primary.main",
              "&:hover": { bgcolor: isRecording ? "#c62828" : "primary.dark" },
              boxShadow: "none",
            }}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        )}

        {/* Live transcript while recording */}
        {isRecording && (transcript || interim) && (
          <Box sx={{ mb: 2, p: 2, bgcolor: "#fafafa", border: "1px solid #e0e0e0", borderRadius: "10px", minHeight: 56 }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "text.disabled", mb: 0.5, textTransform: "uppercase" }}>
              Live Transcript
            </Typography>
            <Typography sx={{ fontSize: "0.88rem", color: "text.primary", lineHeight: 1.7 }}>
              {transcript}
              <span style={{ color: "#bbb" }}>{interim}</span>
            </Typography>
          </Box>
        )}

        {/* Audio playback — native controls for reliability */}
        {isRecorded && audioUrl && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.disabled" }}>
                Playback
              </Typography>
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={discardRecording} sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <audio
              src={audioUrl}
              controls
              style={{ width: "100%", borderRadius: "8px" }}
            />
            <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.5 }}>
              Duration: {formatTime(elapsed)}
            </Typography>
          </Box>
        )}

        {/* Editable transcript */}
        {isRecorded && (
          <TextField
            multiline minRows={3} fullWidth
            label="Transcript"
            placeholder="No transcript captured — you can type notes here manually."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            disabled={isSaving}
            sx={{ mb: 2 }}
            helperText={transcript ? "Auto-generated — edit if needed." : "Transcription requires Chrome or Edge browser."}
          />
        )}

        {/* Notes */}
        {(isRecorded || isSaving) && (
          <TextField
            multiline rows={2} fullWidth
            label="Additional Notes (optional)"
            placeholder="Any extra observations…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={isSaving}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSaving}>Cancel</Button>
        {isRecorded && (
          <Button onClick={handleSave} variant="contained" disabled={isSaving}
            startIcon={isSaving && <CircularProgress size={16} sx={{ color: "#fff" }} />}
            sx={{ borderRadius: "8px", fontWeight: 700, boxShadow: "none" }}
          >
            {isSaving ? "Saving…" : "Save Recording"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
