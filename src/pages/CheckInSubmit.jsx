import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button, Stack,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentIcon  from "@mui/icons-material/Assignment";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

function inputSx(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused":  { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& textarea, & input": { "&::placeholder": { color: "rgba(255,255,255,0.18)", opacity: 1 } },
  };
}

export default function CheckInSubmit() {
  const { trainerId } = useParams();
  const [trainer,    setTrainer]    = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [clientName, setClientName] = useState("");
  const [date,       setDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [answers,    setAnswers]    = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const brand = trainer?.brandColor || "#C9A84C";
  const sx    = inputSx(brand);

  useEffect(() => {
    async function load() {
      try {
        const [trainerSnap, cfgSnap] = await Promise.all([
          getDoc(doc(db, "barbers", trainerId)),
          getDoc(doc(db, "barbers", trainerId, "config", "checkIn")),
        ]);
        if (trainerSnap.exists()) setTrainer(trainerSnap.data());
        if (cfgSnap.exists()) setQuestions(cfgSnap.data().questions || []);
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    }
    load();
  }, [trainerId]);

  async function submit() {
    if (!clientName.trim()) { setError("Please enter your full name."); return; }
    if (!date)               { setError("Please enter the date."); return; }
    setError("");
    setSubmitting(true);
    try {
      const answerArr = questions.map(q => ({
        questionId: q.id,
        question:   q.text,
        answer:     (answers[q.id] || "").trim(),
      }));
      await addDoc(collection(db, "barbers", trainerId, "checkInSubmissions"), {
        clientName: clientName.trim(),
        date,
        answers:    answerArr,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} thickness={2} size={50} />
      </Box>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 380 }}>
          <AssignmentIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>
            Form not available
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(255,255,255,0.22)", mt: 1 }}>
            Your trainer hasn't set up any check-in questions yet.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 420 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: brand, mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: "#fff", mb: 1 }}>
            Check-in submitted!
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            Thanks <strong style={{ color: "rgba(255,255,255,0.7)" }}>{clientName}</strong>. Your trainer will review your responses.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#0d0d0d", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ borderBottom: `3px solid ${brand}`, bgcolor: "#111", py: { xs: 5, md: 7 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="sm">
          {trainer?.businessName && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: brand, mb: 1.5 }}>
              {trainer.businessName}
            </Typography>
          )}
          <Typography sx={{ fontFamily: SERIF, fontWeight: 400, fontSize: { xs: "1.9rem", md: "2.5rem" }, color: "#fff", lineHeight: 1.1 }}>
            Weekly Check-In
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "rgba(255,255,255,0.38)", mt: 1, fontWeight: 300 }}>
            Answer each question honestly — your trainer uses this to guide your next session.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 7 }, px: { xs: 2, md: 5 } }}>
        {/* Name + Date */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 5 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            sx={sx}
          />
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={sx}
          />
        </Stack>

        {/* Questions */}
        <Stack spacing={3} sx={{ mb: 5 }}>
          {questions.map((q, idx) => (
            <Box key={q.id} sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
              {/* Question header */}
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.25)", display: "flex", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ color: brand, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0 }}>
                  {String(idx + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.4 }}>
                  {q.text}
                </Typography>
              </Box>
              {/* Answer box */}
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Your answer…"
                  multiline
                  minRows={3}
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  sx={{
                    ...sx,
                    "& .MuiOutlinedInput-root": {
                      ...sx["& .MuiOutlinedInput-root"],
                      bgcolor: "rgba(255,255,255,0.02)",
                    },
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>

        {error && (
          <Typography sx={{ color: "#ff6b6b", fontSize: "0.82rem", mb: 2 }}>{error}</Typography>
        )}

        <Button
          fullWidth
          onClick={submit}
          disabled={submitting}
          sx={{ py: 1.9, bgcolor: brand, color: "#0d0d0d", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brand, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brand, opacity: 0.5 } }}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: "#0d0d0d" }} /> : "Submit Check-In"}
        </Button>
      </Container>
    </Box>
  );
}
