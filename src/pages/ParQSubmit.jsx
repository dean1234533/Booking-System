import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button, Stack,
  CircularProgress, Checkbox, FormControlLabel,
} from "@mui/material";
import CheckCircleIcon    from "@mui/icons-material/CheckCircle";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
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

/* ─── Signature pad ───────────────────────────────────────────────────────── */
function SignaturePad({ brand, onChange }) {
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });
  const hasStrokes = useRef(false);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(lastPos.current.x, lastPos.current.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1714";
    ctx.fill();
    hasStrokes.current = true;
  }, []);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1714";
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    onChange(null);
  }

  return (
    <Box>
      <canvas
        ref={canvasRef}
        width={560}
        height={150}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{
          display: "block",
          width: "100%",
          background: "#fafaf8",
          border: `1.5px solid rgba(255,255,255,0.15)`,
          cursor: "crosshair",
          touchAction: "none",
          borderRadius: 2,
        }}
      />
      <Button
        size="small"
        onClick={clear}
        sx={{ mt: 0.75, color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", p: 0, minWidth: 0, "&:hover": { color: "#ff6b6b", bgcolor: "transparent" } }}
      >
        Clear signature
      </Button>
    </Box>
  );
}

/* ─── Yes / No toggle buttons ────────────────────────────────────────────── */
function YesNo({ value, onChange, brand }) {
  return (
    <Stack direction="row" spacing={1}>
      {["yes", "no"].map(opt => {
        const active = value === opt;
        const isYes  = opt === "yes";
        const color  = isYes ? "#e0a800" : "#66bb6a";
        return (
          <Button
            key={opt}
            onClick={() => onChange(opt)}
            sx={{
              minWidth: 72, py: 0.85, fontWeight: 900, fontSize: "0.72rem",
              letterSpacing: "0.12em", borderRadius: 0, boxShadow: "none",
              border: "1.5px solid",
              borderColor: active ? color : "rgba(255,255,255,0.12)",
              bgcolor:     active ? (isYes ? "rgba(224,168,0,0.16)" : "rgba(102,187,106,0.14)") : "transparent",
              color:       active ? color : "rgba(255,255,255,0.35)",
              transition:  "all .15s",
              "&:hover": {
                borderColor: color, color: color,
                bgcolor: isYes ? "rgba(224,168,0,0.1)" : "rgba(102,187,106,0.1)",
              },
            }}
          >
            {opt.toUpperCase()}
          </Button>
        );
      })}
    </Stack>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ParQSubmit() {
  const { trainerId } = useParams();

  const [trainer,    setTrainer]    = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [clientName, setClientName] = useState("");
  const [dob,        setDob]        = useState("");
  const [date,       setDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [answers,    setAnswers]    = useState({});   // { [qId]: { answer: "yes"|"no", details: "" } }
  const [signature,  setSignature]  = useState(null);
  const [agreed,     setAgreed]     = useState(false);
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
          getDoc(doc(db, "barbers", trainerId, "config", "parQ")),
        ]);
        if (trainerSnap.exists()) setTrainer(trainerSnap.data());
        if (cfgSnap.exists()) setQuestions(cfgSnap.data().questions || []);
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    }
    load();
  }, [trainerId]);

  function setAnswer(qId, field, value) {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [field]: value },
    }));
  }

  async function submit() {
    setError("");
    if (!clientName.trim()) { setError("Please enter your full name."); return; }
    if (!dob)               { setError("Please enter your date of birth."); return; }
    if (!date)              { setError("Please enter today's date."); return; }

    const unanswered = questions.filter(q => !answers[q.id]?.answer);
    if (unanswered.length > 0) {
      setError("Please answer all questions before submitting.");
      return;
    }
    if (!signature) { setError("Please sign the form before submitting."); return; }
    if (!agreed)    { setError("Please read and agree to the declaration."); return; }

    setSubmitting(true);
    try {
      const answerArr = questions.map(q => ({
        questionId: q.id,
        question:   q.text,
        answer:     answers[q.id]?.answer || "no",
        details:    (answers[q.id]?.details || "").trim(),
      }));

      await addDoc(collection(db, "barbers", trainerId, "parQSubmissions"), {
        clientName: clientName.trim(),
        dob,
        date,
        answers:    answerArr,
        signature,
        agreedToDeclaration: true,
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

  /* ── Loading ── */
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} thickness={2} size={50} />
      </Box>
    );
  }

  /* ── No questions set ── */
  if (questions.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 380 }}>
          <HealthAndSafetyIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>
            Form not available
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(255,255,255,0.22)", mt: 1 }}>
            Your trainer hasn't set up the PAR-Q form yet.
          </Typography>
        </Box>
      </Box>
    );
  }

  /* ── Success ── */
  if (submitted) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 440 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: brand, mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: "#fff", mb: 1 }}>
            PAR-Q submitted!
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            Thank you, <strong style={{ color: "rgba(255,255,255,0.7)" }}>{clientName}</strong>. Your trainer will review your health information before your session.
          </Typography>
        </Box>
      </Box>
    );
  }

  /* ── Form ── */
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
          <Typography sx={{ fontFamily: SERIF, fontWeight: 400, fontSize: { xs: "1.9rem", md: "2.4rem" }, color: "#fff", lineHeight: 1.1, mb: 1 }}>
            Physical Activity Readiness Questionnaire
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
            PAR-Q Health Screening Form
          </Typography>
          <Box sx={{ mt: 2.5, p: 2, bgcolor: "rgba(224,168,0,0.08)", border: "1px solid rgba(224,168,0,0.2)" }}>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>
              Please answer every question honestly and to the best of your knowledge. This form must be completed before your first session and kept on record by your trainer.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 7 }, px: { xs: 2, md: 3 } }}>

        {/* Personal details */}
        <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brand, mb: 2 }}>
          Personal Details
        </Typography>
        <Stack spacing={2} sx={{ mb: 5 }}>
          <TextField fullWidth label="Full Name" value={clientName} onChange={e => setClientName(e.target.value)} sx={sx} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth label="Date of Birth" type="date"
              value={dob} onChange={e => setDob(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={sx}
            />
            <TextField
              fullWidth label="Today's Date" type="date"
              value={date} onChange={e => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={sx}
            />
          </Stack>
        </Stack>

        {/* Health questions */}
        <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brand, mb: 2 }}>
          Health Questions
        </Typography>
        <Stack spacing={3} sx={{ mb: 5 }}>
          {questions.map((q, idx) => {
            const ans     = answers[q.id] || {};
            const isYes   = ans.answer === "yes";
            return (
              <Box key={q.id} sx={{ bgcolor: "#111", border: `1px solid ${isYes ? "rgba(224,168,0,0.25)" : "rgba(255,255,255,0.07)"}`, overflow: "hidden" }}>
                {/* Question */}
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.25)", display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Typography sx={{ color: brand, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0, mt: 0.25 }}>
                    {String(idx + 1).padStart(2, "0")}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.55 }}>
                    {q.text}
                  </Typography>
                </Box>
                {/* Yes / No */}
                <Box sx={{ px: 2.5, pt: 2, pb: isYes ? 1 : 2 }}>
                  <YesNo
                    value={ans.answer || null}
                    onChange={v => setAnswer(q.id, "answer", v)}
                    brand={brand}
                  />
                </Box>
                {/* Details (only when Yes) */}
                {isYes && (
                  <Box sx={{ px: 2.5, pb: 2.5 }}>
                    <TextField
                      fullWidth
                      placeholder="Please provide details…"
                      multiline minRows={2}
                      value={ans.details || ""}
                      onChange={e => setAnswer(q.id, "details", e.target.value)}
                      sx={{
                        ...sx,
                        "& .MuiOutlinedInput-root": {
                          ...sx["& .MuiOutlinedInput-root"],
                          bgcolor: "rgba(224,168,0,0.04)",
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Declaration */}
        <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brand, mb: 2 }}>
          Declaration
        </Typography>
        <Box sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", p: 2.5, mb: 3 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.85, mb: 2 }}>
            I, <strong style={{ color: "rgba(255,255,255,0.75)" }}>{clientName || "[your name]"}</strong>, confirm that I have read and answered all of the above questions honestly and to the best of my knowledge. I understand that if my health changes so that I would answer YES to any of the above questions, I will inform my trainer before my next session.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                sx={{ color: "rgba(255,255,255,0.2)", "&.Mui-checked": { color: brand }, py: 0.5 }}
              />
            }
            label={
              <Typography sx={{ fontFamily: SANS, fontSize: "0.83rem", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                I agree to the above declaration
              </Typography>
            }
          />
        </Box>

        {/* Signature */}
        <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brand, mb: 1.5 }}>
          Signature
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", mb: 2, lineHeight: 1.6 }}>
          Please sign in the box below using your finger or mouse.
        </Typography>
        <Box sx={{ mb: 5 }}>
          <SignaturePad brand={brand} onChange={setSignature} />
        </Box>

        {/* Error */}
        {error && (
          <Typography sx={{ color: "#ff6b6b", fontSize: "0.82rem", mb: 2, fontFamily: SANS }}>
            {error}
          </Typography>
        )}

        {/* Submit */}
        <Button
          fullWidth onClick={submit} disabled={submitting}
          sx={{ py: 2, bgcolor: brand, color: "#0d0d0d", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brand, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brand, opacity: 0.5 } }}
        >
          {submitting
            ? <CircularProgress size={20} sx={{ color: "#0d0d0d" }} />
            : "Submit PAR-Q Form"}
        </Button>

        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.18)", textAlign: "center", mt: 2.5, lineHeight: 1.6 }}>
          This form is stored securely and only accessible to your trainer.
        </Typography>

      </Container>
    </Box>
  );
}
