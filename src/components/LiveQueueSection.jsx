import React, { useState, useEffect, useRef } from "react";
import {
  Box, Container, Typography, Button, TextField, Stack,
  CircularProgress, Chip, LinearProgress,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { collection, onSnapshot, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

function genSession() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
  };
}

export default function LiveQueueSection({ shopId, brandColor = "#C9A84C", displayFont, team = [], showWhenClosed = false }) {
  const [config, setConfig]   = useState({ avgCutMins: 20, activeBarbers: 1, isPaused: false, isOpen: false });
  const [configLoaded, setCL] = useState(false);
  const [queue, setQueue]     = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [view, setView]       = useState("join");
  const [form, setForm]       = useState({ name: "", haircutType: "", preferredBarber: "" });
  const [joining, setJoining] = useState(false);
  const [error, setError]     = useState("");
  const notifiedRef           = useRef(false);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`queue_${shopId}`);
      if (raw) { const p = JSON.parse(raw); setMyEntry(p); setView("waiting"); }
    } catch {}
  }, [shopId]);

  // Config listener
  useEffect(() => {
    if (!shopId) return;
    const unsub = onSnapshot(
      doc(db, "barbers", shopId, "queueConfig", "settings"),
      snap => {
        const data = snap.exists()
          ? snap.data()
          : { avgCutMins: 20, activeBarbers: 1, isPaused: false, isOpen: false };
        setConfig(data);
        setCL(true);
      },
      () => setCL(true)
    );
    return unsub;
  }, [shopId]);

  // Queue listener — only waiting/called entries
  useEffect(() => {
    if (!shopId) return;
    const unsub = onSnapshot(
      collection(db, "barbers", shopId, "liveQueue"),
      snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(e => e.status === "waiting" || e.status === "called")
          .sort((a, b) => (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0));
        setQueue(data);
      }
    );
    return unsub;
  }, [shopId]);

  // "You're next" browser notification
  useEffect(() => {
    if (!myEntry || notifiedRef.current) return;
    const pos = queue.findIndex(e => e.id === myEntry.id);
    if (pos === 1) {
      notifiedRef.current = true;
      try { new Notification("You're up next!", { body: "Head to the shop — you're next in the queue." }); } catch {}
    }
  }, [queue, myEntry]);

  async function joinQueue() {
    if (!form.name.trim()) { setError("Enter your name."); return; }
    setError(""); setJoining(true);
    try {
      const sessionId = genSession();
      const docRef = await addDoc(collection(db, "barbers", shopId, "liveQueue"), {
        name:            form.name.trim(),
        haircutType:     form.haircutType.trim(),
        preferredBarber: form.preferredBarber.trim(),
        status:          "waiting",
        sessionId,
        joinedAt:        serverTimestamp(),
      });
      const entry = { id: docRef.id, sessionId, name: form.name.trim() };
      setMyEntry(entry);
      localStorage.setItem(`queue_${shopId}`, JSON.stringify(entry));
      setView("waiting");
      try { Notification.requestPermission(); } catch {}
    } catch (e) {
      console.error(e);
      setError("Could not join queue — please try again.");
    } finally { setJoining(false); }
  }

  function leaveQueue() {
    localStorage.removeItem(`queue_${shopId}`);
    setMyEntry(null); setView("join");
    setForm({ name: "", haircutType: "", preferredBarber: "" });
    notifiedRef.current = false;
  }

  const myPos   = myEntry ? queue.findIndex(e => e.id === myEntry.id) : -1;
  const avgCut  = config.avgCutMins  || 20;
  const active  = config.activeBarbers || 1;
  const waitMin = myPos > 0 ? Math.round((myPos * avgCut) / active) : 0;

  // Show loading state
  if (!configLoaded) return null;

  // Queue closed — show a message only on the dedicated queue page
  if (!config.isOpen) {
    if (!showWhenClosed) return null;
    return (
      <Box sx={{ py: { xs: 10, md: 14 }, textAlign: "center", px: 3 }}>
        <PeopleIcon sx={{ fontSize: 52, color: "rgba(255,255,255,0.1)", mb: 2 }} />
        <Typography sx={{ fontFamily: displayFont || SERIF, fontSize: "1.6rem", color: "rgba(255,255,255,0.35)", mb: 1 }}>
          Queue is currently closed
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.22)", lineHeight: 1.75 }}>
          The barber hasn't opened the queue yet. Check back closer to opening time.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#0a0a0a", py: { xs: 10, md: 14 }, borderTop: `3px solid ${brandColor}` }}>
      <Container maxWidth="sm">

        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography sx={{ color: brandColor, fontWeight: 700, letterSpacing: "0.3em", fontSize: "0.62rem", textTransform: "uppercase", mb: 1.5 }}>
            Live Queue
          </Typography>
          <Typography sx={{
            fontFamily: displayFont || SERIF,
            fontSize: { xs: "2rem", md: "2.6rem" },
            fontWeight: 400, color: "#fff", lineHeight: 1.15,
          }}>
            Join the Queue
          </Typography>
          <Box sx={{ width: 36, height: 2, bgcolor: brandColor, mx: "auto", mt: 2.5 }} />
        </Box>

        {/* Stats strip */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: { xs: 3, sm: 5 }, mb: 5 }}>
          {[
            { val: queue.length, label: "In Queue" },
            { val: active,       label: "Barbers" },
            { val: avgCut,       label: "Min / Cut" },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <Box sx={{ width: 1, bgcolor: "rgba(255,255,255,0.07)" }} />}
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "2.8rem", color: "#fff", lineHeight: 1 }}>{s.val}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mt: 0.5 }}>
                  {s.label}
                </Typography>
              </Box>
            </React.Fragment>
          ))}
        </Box>

        {/* Paused banner */}
        {config.isPaused && (
          <Box sx={{ bgcolor: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", p: 2, mb: 4, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "#eab308", fontWeight: 600 }}>
              Queue is temporarily paused — back soon.
            </Typography>
          </Box>
        )}

        {/* JOIN FORM */}
        {view === "join" && !config.isPaused && (
          <Box sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", p: 3 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mb: 2.5 }}>
              Your Details
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth label="Your Name *"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && joinQueue()}
                sx={fieldSx(brandColor)}
              />
              <TextField
                fullWidth label="Haircut Type (optional)"
                placeholder="e.g. Skin fade, trim…"
                value={form.haircutType}
                onChange={e => setForm(p => ({ ...p, haircutType: e.target.value }))}
                sx={fieldSx(brandColor)}
              />
              {team.length > 0 && (
                <TextField
                  fullWidth label="Preferred Barber (optional)"
                  value={form.preferredBarber}
                  onChange={e => setForm(p => ({ ...p, preferredBarber: e.target.value }))}
                  sx={fieldSx(brandColor)}
                />
              )}
              {error && (
                <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>
              )}
              <Button
                fullWidth onClick={joinQueue}
                disabled={joining || !form.name.trim()}
                sx={{
                  bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.82rem",
                  letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.8, boxShadow: "none",
                  "&:hover":    { bgcolor: brandColor, filter: "brightness(1.1)", boxShadow: "none" },
                  "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
                }}
              >
                {joining ? <CircularProgress size={18} sx={{ color: "#0d0d0d" }} /> : "Join Queue"}
              </Button>
            </Stack>
          </Box>
        )}

        {/* WAITING VIEW */}
        {view === "waiting" && (
          <>
            {myPos === -1 ? (
              // Already served / removed
              <Box sx={{ bgcolor: "#111", border: `1px solid ${brandColor}35`, p: 4, textAlign: "center" }}>
                <CheckCircleIcon sx={{ fontSize: 50, color: brandColor, mb: 2 }} />
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.6rem", color: "#fff", mb: 1 }}>All done!</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.38)", mb: 3, lineHeight: 1.7 }}>
                  It looks like you've been called or the session has ended.
                </Typography>
                <Button onClick={leaveQueue}
                  sx={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.45)", border: "1px solid", borderRadius: 0, px: 3, py: 1, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Rejoin Queue
                </Button>
              </Box>
            ) : (
              <Box sx={{ bgcolor: "#111", border: `1px solid ${brandColor}35`, p: { xs: 3, sm: 4 }, textAlign: "center" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mb: 1.5 }}>
                  Your Position
                </Typography>

                <Typography sx={{ fontFamily: SERIF, fontSize: "6rem", color: brandColor, lineHeight: 1, mb: 0.5 }}>
                  #{myPos + 1}
                </Typography>

                <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "1rem", color: "#fff", mb: 1 }}>
                  {myEntry?.name}
                </Typography>

                {myPos === 0 ? (
                  <Chip
                    label="You're next!"
                    sx={{ bgcolor: `${brandColor}25`, color: brandColor, fontWeight: 700, fontSize: "0.72rem", borderRadius: 0, height: 26, mb: 2 }}
                  />
                ) : (
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", mb: 2 }}>
                    ~{waitMin} min wait · {myPos} person{myPos !== 1 ? "s" : ""} ahead
                  </Typography>
                )}

                {queue.length > 0 && (
                  <Box sx={{ mb: 3, px: { xs: 0, sm: 3 } }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(5, 100 - (myPos / Math.max(queue.length, 1)) * 100)}
                      sx={{
                        height: 3,
                        bgcolor: "rgba(255,255,255,0.07)",
                        "& .MuiLinearProgress-bar": { bgcolor: brandColor },
                      }}
                    />
                  </Box>
                )}

                <Typography sx={{ fontFamily: SANS, fontSize: "0.66rem", color: "rgba(255,255,255,0.22)", mb: 3 }}>
                  Updates in real time — keep this page open
                </Typography>

                <Button onClick={leaveQueue}
                  sx={{ borderColor: "rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.32)", border: "1px solid", borderRadius: 0, px: 3, py: 0.9, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Leave Queue
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
