import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Stack, IconButton, Chip,
  TextField, CircularProgress, Switch,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebase/config";
import { SITE_URL } from "../../../utils/siteUrl";
import BookingLinkQrDialog from "../BookingLinkQrDialog";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const DEFAULT_CONFIG = { avgCutMins: 20, activeBarbers: 1, isPaused: false, isOpen: false };

function cfgFieldSx() {
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5, color: "#101828", bgcolor: "#fff",
      "& fieldset":             { borderColor: "#D0D5DD" },
      "&:hover fieldset":       { borderColor: "#98A2B3" },
      "&.Mui-focused fieldset": { borderColor: "#667085" },
    },
  };
}

export default function QueueManagementTab({ barber, brandColor = "#2563EB" }) {
  const [queue,  setQueue]  = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const tid = barber?.uid;

  const queueUrl = `${SITE_URL}/queue/${tid}`;

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

    // Best-effort — the queue entry only gets a pushSubscription if that
    // customer opted in on the join page, so silently skip if it fails.
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      await fetch("/api/send-queue-push", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          shopId: tid,
          entryId: next.id,
          payload: { title: "You're up!", body: "Please head to the shop now — it's your turn.", url: queueUrl },
        }),
      });
    } catch {}
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
    waiting: { label: "Waiting", bg: "#F2F4F7", color: "#475467" },
    called:  { label: "Called",  bg: `rgba(${rr},${gg},${bb},0.18)`, color: brandColor },
  };

  const waiting = queue.filter(e => e.status === "waiting").length;
  const called  = queue.filter(e => e.status === "called").length;

  return (
    <Box>

      {/* ── Customer access ── */}
      <Box sx={{
        bgcolor: `${brandColor}0D`, border: `1px solid ${brandColor}33`,
        borderRadius: 2, p: { xs: 2, sm: 2.5 }, mb: 3,
        display: "flex", alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between", gap: 2, flexWrap: "wrap",
      }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#101828", mb: 0.5 }}>
            How clients join and get called
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "#475467", lineHeight: 1.65, mb: 1 }}>
            Clients can tap <strong>View live queue</strong> on your public barber page, or you can send them this direct link. After joining, they allow browser notifications and keep the queue page open to receive position updates, sound and vibration when called.
          </Typography>
          <Typography sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#344054", wordBreak: "break-all" }}>
            {queueUrl}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small" startIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />}
            onClick={copyLink}
            sx={{ color: brandColor, border: `1px solid ${brandColor}66`, bgcolor: "#fff", textTransform: "none", fontWeight: 700 }}
          >
            {copied ? "Copied!" : "Copy client link"}
          </Button>
          <Button
            size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
            component="a" href={queueUrl} target="_blank" rel="noopener noreferrer"
            sx={{ color: "#344054", border: "1px solid #D0D5DD", bgcolor: "#fff", textTransform: "none", fontWeight: 700 }}
          >
            Open client view
          </Button>
          <Button
            size="small" startIcon={<QrCode2Icon sx={{ fontSize: 15 }} />}
            onClick={() => setQrOpen(true)}
            sx={{ color: "#344054", border: "1px solid #D0D5DD", bgcolor: "#fff", textTransform: "none", fontWeight: 700 }}
          >
            QR code
          </Button>
        </Stack>
      </Box>

      <BookingLinkQrDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        url={queueUrl}
        brandColor={brandColor}
        title="Your live queue QR code"
        description={`Scan to join the queue at ${queueUrl.replace(/^https:\/\//, "")}. Use this on a door sign, window sticker, or counter card.`}
        filename={`bookrightly-${tid}-queue-qr`}
      />

      {/* ── Config strip ── */}
      <Box sx={{
        bgcolor: "#F8FAFC", border: "1px solid #E4E7EC", borderRadius: 2,
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
              "& .MuiSwitch-track":              { bgcolor: "#98A2B3" },
              "& .Mui-checked + .MuiSwitch-track": { bgcolor: brandColor },
            }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: config.isOpen ? brandColor : "#344054", fontWeight: 700 }}>
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
              "& .MuiSwitch-track":              { bgcolor: "#98A2B3" },
              "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#eab308" },
            }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: config.isPaused ? "#B54708" : "#344054", fontWeight: 600 }}>
            Paused
          </Typography>
        </Box>

        {/* Active barbers */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "#344054", fontWeight: 600 }}>
            Barbers:
          </Typography>
          <TextField
            size="small" type="number"
            value={config.activeBarbers || 1}
            onChange={e => saveConfig({ activeBarbers: Math.max(1, Number(e.target.value)) })}
            inputProps={{ min: 1, max: 10, style: { color: "#101828", width: 36, textAlign: "center", fontSize: "0.8rem", padding: "4px 6px" } }}
            sx={{ ...cfgFieldSx(), width: 68 }}
          />
        </Box>

        {/* Avg cut time */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "#344054", fontWeight: 600 }}>
            Min/cut:
          </Typography>
          <TextField
            size="small" type="number"
            value={config.avgCutMins || 20}
            onChange={e => saveConfig({ avgCutMins: Math.max(5, Number(e.target.value)) })}
            inputProps={{ min: 5, max: 120, style: { color: "#101828", width: 36, textAlign: "center", fontSize: "0.8rem", padding: "4px 6px" } }}
            sx={{ ...cfgFieldSx(), width: 68 }}
          />
        </Box>

        {/* Actions */}
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
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
          <Box key={s.label} sx={{ bgcolor: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, minWidth: 128, px: 3, py: 2 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.9rem", color: "#101828", lineHeight: 1 }}>{s.val}</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#667085", mt: 0.5 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Queue list ── */}
      {queue.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, px: 2, border: "1px dashed #D0D5DD", borderRadius: 2, bgcolor: "#FCFCFD" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem", color: "#344054" }}>
            Queue is empty
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "#667085", mt: 0.75, lineHeight: 1.8 }}>
            Open the queue when walk-ins begin, then share the client link above:{" "}
            <Box component="span" onClick={copyLink} sx={{ cursor: "pointer", color: brandColor, fontWeight: 700 }}>
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
                bgcolor: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden",
              }}>
                {/* Position */}
                <Box sx={{
                  width: 52, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRight: "1px solid #E4E7EC", py: 2.5,
                }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.35rem", color: idx === 0 ? brandColor : "#667085" }}>
                    {idx + 1}
                  </Typography>
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1, px: 2, py: 1.5, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#101828", fontSize: "0.9rem" }}>
                    {entry.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.3 }}>
                    {entry.haircutType && (
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "#667085" }}>
                        {entry.haircutType}
                      </Typography>
                    )}
                    {entry.preferredBarber && (
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "#667085" }}>
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
                    sx={{ color: "#667085", "&:hover": { color: "#16A34A" } }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => removeEntry(entry.id)} title="Remove"
                    sx={{ color: "#98A2B3", "&:hover": { color: "#D92D20" } }}>
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
