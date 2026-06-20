import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button, Stack, CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

export default function ColourApprovalPage() {
  const { tradieId, paletteId } = useParams();
  const [loading,    setLoading]    = useState(true);
  const [tradie,     setTradie]     = useState(null);
  const [palette,    setPalette]    = useState(null);
  const [clientName, setClientName] = useState("");
  const [feedback,   setFeedback]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const brand = tradie?.brandColor || "#b5924c";

  useEffect(() => {
    async function load() {
      try {
        const [tradieSnap, palSnap] = await Promise.all([
          getDoc(doc(db, "barbers", tradieId)),
          getDoc(doc(db, "barbers", tradieId, "colourPalettes", paletteId)),
        ]);
        if (tradieSnap.exists()) setTradie(tradieSnap.data());
        if (palSnap.exists())   setPalette({ id: palSnap.id, ...palSnap.data() });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [tradieId, paletteId]);

  async function handleApprove() {
    if (!clientName.trim()) { setError("Please enter your name."); return; }
    setError(""); setSubmitting(true);
    try {
      await addDoc(
        collection(db, "barbers", tradieId, "colourPalettes", paletteId, "approvals"),
        {
          clientName: clientName.trim(),
          feedback:   feedback.trim(),
          status:     "approved",
          submittedAt: serverTimestamp(),
        }
      );
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress sx={{ color: brand }} thickness={2} size={44} />
    </Box>
  );

  if (!palette) return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#78716c", mb: 1 }}>Palette not found</Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "#a8a29e" }}>This link may have expired or been removed.</Typography>
      </Box>
    </Box>
  );

  if (submitted) return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Box sx={{ textAlign: "center", maxWidth: 440 }}>
        <CheckCircleIcon sx={{ fontSize: 58, color: brand, mb: 2 }} />
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.9rem", fontWeight: 400, color: "#1c1917", mb: 1, lineHeight: 1.2 }}>
          Colours approved!
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: "#78716c", lineHeight: 1.75 }}>
          Thank you, <strong style={{ color: "#1c1917" }}>{clientName}</strong>.{" "}
          Your decorator has been notified and will be in touch.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: "#faf8f5", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ borderBottom: `3px solid ${brand}`, bgcolor: "#fff", py: { xs: 4, md: 6 } }}>
        <Container maxWidth="sm">
          {tradie?.businessName && (
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.26em", textTransform: "uppercase", color: brand, mb: 1.5,
            }}>
              {tradie.businessName}
            </Typography>
          )}
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.75rem", md: "2.3rem" }, color: "#1c1917", lineHeight: 1.1, mb: 1 }}>
            {palette.name}
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "#78716c", lineHeight: 1.65 }}>
            Your decorator has chosen the following colour scheme. Review each colour below and add your approval.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 7 } }}>

        {/* Colour swatches */}
        <Stack spacing={1.5} sx={{ mb: 5 }}>
          {(palette.colours || []).map((c, i) => (
            <Box key={i} sx={{
              display: "flex", alignItems: "center", gap: 2.5,
              bgcolor: "#fff", border: "1px solid #e8e3dc", p: 2,
            }}>
              <Box sx={{
                width: 76, height: 76, bgcolor: c.hex, flexShrink: 0,
                boxShadow: `0 6px 20px ${c.hex}28`,
              }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#1c1917", fontSize: "0.95rem" }}>
                  {c.name || "Colour"}
                </Typography>
                <Typography sx={{
                  fontFamily: "'Courier New', monospace", fontSize: "0.8rem",
                  color: "#a8a29e", mt: 0.3, letterSpacing: "0.04em",
                }}>
                  {(c.hex || "").toUpperCase()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* Approval form */}
        <Box sx={{ bgcolor: "#fff", border: "1px solid #e8e3dc", p: 3, mb: 3 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#a8a29e", mb: 2.5 }}>
            Your Approval
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth label="Your Name *"
              value={clientName} onChange={e => setClientName(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
            />
            <TextField
              fullWidth label="Feedback (optional)"
              multiline rows={3}
              value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Any comments or requests for your decorator…"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
            />
          </Stack>
        </Box>

        {error && (
          <Typography sx={{ color: "#ff6b6b", fontSize: "0.82rem", mb: 2 }}>{error}</Typography>
        )}

        <Button
          fullWidth
          onClick={handleApprove}
          disabled={submitting}
          sx={{
            py: 1.9, bgcolor: brand, color: "#fff",
            fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em",
            textTransform: "uppercase", borderRadius: 0, boxShadow: "none",
            "&:hover":    { bgcolor: brand, filter: "brightness(0.9)" },
            "&:disabled": { bgcolor: brand, opacity: 0.5 },
          }}
        >
          {submitting
            ? <CircularProgress size={20} sx={{ color: "#fff" }} />
            : "Approve These Colours"}
        </Button>

        {tradie?.businessName && (
          <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "#c8c3bb", textAlign: "center", mt: 3, letterSpacing: "0.06em" }}>
            {tradie.businessName} · Colour Approval Portal
          </Typography>
        )}
      </Container>
    </Box>
  );
}
