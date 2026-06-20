import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Stack, IconButton, Chip,
  TextField, CircularProgress, Switch,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const DEFAULT_CONFIG = { avgCutMins: 20, activeBarbers: 1, isPaused: false, isOpen: false };

function cfgFieldSx() {
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 0, color: "#fff",
      "& fieldset":             { borderColor: "rgba(255,255,255,0.15)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.3)" },
      "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.4)" },
    },
  };
}

export default function QueueManagementTab({ barber, brandColor = "#C9A84C" }) {
  const [queue,  setQueue]  = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  const tid = barber?.uid;

  const queueUrl = `${window.location.origin}/queue/${tid}`;

  // Real-time queue listener
  useEffect(() => {
    if (!tid) return;
    const unsub = onSnapshot(collection(db, "barbers", tid, "liveQueue"), snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status !== "done")
        .sort((a, b) => (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0));
      setQueue(data);
    });
    return unsub;
  }, [tid]);

  // Config listener
  useEffect(() => {
    if (!tid) return;
    const unsub = onSnapshot(doc(db, "barbers", tid, "queueConfig", "settings"), snap => {
      setConfig(snap.exists() ? snap.data() : DEFAULT_CONFIG);
    });
    return unsub;
  }, [tid]);

  async function saveConfig(updates) {
    try {
      await setDoc(
        doc(db, "barbers", tid, "queueConfig", "settings"),
        { ...config, ...updates },
        { merge: true }
      );
    } catch (e) { console.error(e); }
  }

  async function callNext() {
    const next = queue.find(e => e.status === "waiting");
    if (!next) return;
    await updateDoc(doc(db, "barbers", tid, "liveQueue", next.id), { status: "called" });
  }

  async function markDone(id) {
    await updateDoc(doc(db, "barbers", tid, "liveQueue", id), {
      status: "done", completedAt: serverTimestamp(),
    });
  }

  async function removeEntry(id) {
    await deleteDoc(doc(db, "barbers", tid, "liveQueue", id));
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(queueUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch {}
  }

  const hex    = (brandColor || "#c9a84c").replace("#", "");
  const rr     = parseInt(hex.slice(0, 2), 16);
  const gg     = parseInt(hex.slice(2, 4), 16);
  const bb     = parseInt(hex.slice(4, 6), 16);

  const STATUS_STYLE = {
    waiting: { label: "Waiting", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" },
    called:  { label: "Called",  bg: `rgba(${rr},${gg},${bb},0.18)`, color: brandColor },
  };

  const waiting = queue.filter(e => e.status === "waiting").length;
  const called  = queue.filter(e => e.status === "called").length;

  return (
    <Box>

      {/* ── Config strip ── */}
      <Box sx={{
        bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)",
        p: 2.5, mb: 3,
        display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center",
      }}>

        {/* Open / Closed */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Switch
            size="small"
            checked={config.isOpen === true}
            onChange={e => saveConfig({ isOpen: e.target.checked })}
            sx={{
              "& .MuiSwitch-track":              { bgcolor: "rgba(255,255,255,0.15)" },
              "& .Mui-checked + .MuiSwitch-track": { bgcolor: brandColor },
            }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: config.isOpen ? brandColor : "rgba(255,255,255,0.3)", fontWeight: 600 }}>
            {config.isOpen ? "Queue Open" : "Queue Closed"}
          </Typography>
        </Box>

        {/* Paused */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Switch
            size="small"
            checked={config.isPaused === true}
            onChange={e => saveConfig({ isPaused: e.target.checked })}
            sx={{
              "& .MuiSwitch-track":              { bgcolor: "rgba(255,255,255,0.15)" },
              "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#eab308" },
            }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: config.isPaused ? "#eab308" : "rgba(255,255,255,0.3)" }}>
            Paused
          </Typography>
        </Box>

        {/* Active barbers */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
            Barbers:
          </Typography>
          <TextField
            size="small" type="number"
            value={config.activeBarbers || 1}
            onChange={e => saveConfig({ activeBarbers: Math.max(1, Number(e.target.value)) })}
            inputProps={{ min: 1, max: 10, style: { color: "#fff", width: 36, textAlign: "center", fontSize: "0.8rem", padding: "4px 6px" } }}
            sx={{ ...cfgFieldSx(), width: 68 }}
          />
        </Box>

        {/* Avg cut time */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
            Min/cut:
          </Typography>
          <TextField
            size="small" type="number"
            value={config.avgCutMins || 20}
            onChange={e => saveConfig({ avgCutMins: Math.max(5, Number(e.target.value)) })}
            inputProps={{ min: 5, max: 120, style: { color: "#fff", width: 36, textAlign: "center", fontSize: "0.8rem", padding: "4px 6px" } }}
            sx={{ ...cfgFieldSx(), width: 68 }}
          />
        </Box>

        {/* Actions */}
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small" startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
            onClick={copyLink}
            sx={{
              color: copied ? brandColor : "rgba(255,255,255,0.4)",
              border: `1px solid ${copied ? brandColor : "rgba(255,255,255,0.1)"}`,
              borderRadius: 0, fontSize: "0.65rem", px: 1.5, py: 0.6, textTransform: "none",
            }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            size="small"
            disabled={waiting === 0}
            onClick={callNext}
            sx={{
              bgcolor: brandColor, color: "#0d0d0d",
              borderRadius: 0, fontSize: "0.65rem", fontWeight: 700,
              px: 1.5, py: 0.6, textTransform: "uppercase", letterSpacing: "0.06em",
              "&:hover":    { bgcolor: brandColor, filter: "brightness(1.1)" },
              "&:disabled": { bgcolor: brandColor, opacity: 0.4, color: "#0d0d0d" },
            }}
          >
            Call Next
          </Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "In Queue",  val: queue.length },
          { label: "Waiting",   val: waiting },
          { label: "Called",    val: called },
        ].map(s => (
          <Box key={s.label} sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", px: 3, py: 2 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.9rem", color: "#fff", lineHeight: 1 }}>{s.val}</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", mt: 0.3 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Queue list ── */}
      {queue.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", color: "rgba(255,255,255,0.18)" }}>
            Queue is empty
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(255,255,255,0.14)", mt: 0.75, lineHeight: 1.8 }}>
            Share this link so customers can join:{" "}
            <Box component="span" onClick={copyLink} sx={{ cursor: "pointer", color: "rgba(255,255,255,0.3)", "&:hover": { color: brandColor } }}>
              {queueUrl}
            </Box>
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {queue.map((entry, idx) => {
            const sc = STATUS_STYLE[entry.status] || STATUS_STYLE.waiting;
            return (
              <Box key={entry.id} sx={{
                display: "flex", alignItems: "center",
                bgcolor: "#111", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
              }}>
                {/* Position */}
                <Box sx={{
                  width: 52, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRight: "1px solid rgba(255,255,255,0.06)", py: 2.5,
                }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.35rem", color: idx === 0 ? brandColor : "rgba(255,255,255,0.28)" }}>
                    {idx + 1}
                  </Typography>
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1, px: 2, py: 1.5, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                    {entry.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.3 }}>
                    {entry.haircutType && (
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
                        {entry.haircutType}
                      </Typography>
                    )}
                    {entry.preferredBarber && (
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", color: "rgba(255,255,255,0.28)" }}>
                        → {entry.preferredBarber}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Status + actions */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, flexShrink: 0 }}>
                  <Chip
                    label={sc.label} size="small"
                    sx={{ bgcolor: sc.bg, color: sc.color, fontSize: "0.6rem", height: 20, borderRadius: 0, letterSpacing: "0.04em" }}
                  />
                  <IconButton size="small" onClick={() => markDone(entry.id)} title="Mark done"
                    sx={{ color: "rgba(255,255,255,0.22)", "&:hover": { color: "#4ade80" } }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => removeEntry(entry.id)} title="Remove"
                    sx={{ color: "rgba(255,255,255,0.18)", "&:hover": { color: "#ff6b6b" } }}>
                    <RemoveCircleOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
