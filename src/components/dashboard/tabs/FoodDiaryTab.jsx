import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, Chip,
  CircularProgress, Tooltip,
} from "@mui/material";
import ShareIcon          from "@mui/icons-material/Share";
import ContentCopyIcon    from "@mui/icons-material/ContentCopy";
import DeleteIcon         from "@mui/icons-material/Delete";
import PictureAsPdfIcon   from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon      from "@mui/icons-material/ArrowBack";
import MenuBookIcon       from "@mui/icons-material/MenuBook";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase/config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TYPE_COLOUR = {
  Breakfast: "#e8c97a", Lunch: "#7ac5e8", Dinner: "#b07ae8",
  Snack: "#7ae8a0", Drink: "#e87a7a", Other: "#9a9080",
};

function printPDF(sub) {
  const rows = DAYS.map(day => {
    const meals = (sub.entries || []).filter(e => e.day === day);
    if (!meals.length) return "";
    return `
      <div class="day">
        <div class="day-label">${day}</div>
        ${meals.map(m => `
          <div class="meal">
            <span class="time">${m.time || "—"}</span>
            <span class="type">${m.type || "—"}</span>
            <span class="desc">${m.description || "—"}</span>
          </div>`).join("")}
      </div>`;
  }).join("");

  const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Food Diary – ${sub.clientName}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:36px 28px;color:#111}
      .hdr{border-bottom:3px solid #C9A84C;padding-bottom:10px;margin-bottom:6px}
      h1{font-size:26px;font-weight:normal;margin:0}
      .meta{font-family:sans-serif;font-size:12px;color:#888;margin-bottom:28px;margin-top:4px}
      .day{margin-bottom:20px;page-break-inside:avoid}
      .day-label{font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;padding-bottom:6px;border-bottom:1px solid #C9A84C;margin-bottom:8px}
      .meal{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #f5f0e8;font-size:13px}
      .time{color:#aaa;font-family:monospace;width:50px;flex-shrink:0}
      .type{font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;width:72px;flex-shrink:0;padding-top:2px}
      .desc{flex:1;line-height:1.5}
      @media print{@page{margin:20px}}
    </style>
  </head><body>
    <div class="hdr"><h1>Food Diary</h1></div>
    <p class="meta"><strong>${sub.clientName}</strong> &nbsp;·&nbsp; Week of ${sub.weekOf || "—"} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${rows}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

export default function FoodDiaryTab({ barber, brandColor }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const [copied,  setCopied]  = useState(false);

  const tid = barber?.uid || barber?.id;

  useEffect(() => { load(); }, [tid]);

  async function load() {
    if (!tid) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "barbers", tid, "foodDiarySubmissions"));
      setSubs(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
      );
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  }

  async function del(id, e) {
    e?.stopPropagation();
    if (!window.confirm("Delete this food diary entry?")) return;
    await deleteDoc(doc(db, "barbers", tid, "foodDiarySubmissions", id));
    setSubs(p => p.filter(s => s.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  function share() {
    navigator.clipboard.writeText(`${window.location.origin}/food-diary/${tid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  // ── Detail ─────────────────────────────────────────────────────────────────
  if (detail) {
    const activeDays = DAYS.filter(d => (detail.entries || []).some(e => e.day === d));
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <IconButton onClick={() => setDetail(null)} sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0, color: "rgba(255,255,255,0.45)", "&:hover": { color: "#fff" } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.98rem" }}>{detail.clientName}</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.74rem" }}>Week of {detail.weekOf || "—"}</Typography>
          </Box>
          <Button
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 15 }} />}
            onClick={() => printPDF(detail)}
            sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", borderRadius: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", px: 2, py: 1, border: "1px solid rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }, boxShadow: "none" }}
          >
            Save PDF
          </Button>
        </Box>

        <Stack spacing={3}>
          {activeDays.length === 0 && (
            <Typography sx={{ color: "rgba(255,255,255,0.25)", textAlign: "center", py: 4 }}>No meals logged.</Typography>
          )}
          {activeDays.map(day => {
            const meals = (detail.entries || []).filter(e => e.day === day);
            return (
              <Box key={day}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 3, height: 14, bgcolor: brandColor, flexShrink: 0 }} />
                  <Typography sx={{ color: brandColor, fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>{day}</Typography>
                </Box>
                <Stack spacing={0.75}>
                  {meals.map((m, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, bgcolor: "#1a1a1a", px: 2.5, py: 1.4, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.78rem", fontFamily: "monospace", width: 44, flexShrink: 0 }}>
                        {m.time || "—"}
                      </Typography>
                      <Chip
                        label={m.type || "Other"}
                        size="small"
                        sx={{ bgcolor: `${TYPE_COLOUR[m.type] || TYPE_COLOUR.Other}1a`, color: TYPE_COLOUR[m.type] || TYPE_COLOUR.Other, fontSize: "0.6rem", fontWeight: 700, height: 20, borderRadius: 0, letterSpacing: "0.06em", minWidth: 72 }}
                      />
                      <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.88rem", fontWeight: 300, flex: 1, lineHeight: 1.5 }}>
                        {m.description || "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
        <Box>
          <Typography sx={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 400 }}>
            Food Diary
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", mt: 0.5 }}>
            Share the link with clients to log their weekly meals and drinks.
          </Typography>
        </Box>
        <Button
          startIcon={copied
            ? <ContentCopyIcon sx={{ fontSize: 15 }} />
            : <ShareIcon sx={{ fontSize: 15 }} />}
          onClick={share}
          sx={{
            bgcolor: copied ? "rgba(122,232,160,0.12)" : brandColor,
            color: copied ? "#7ae8a0" : "#0d0d0d",
            fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.08em",
            px: 2.5, py: 1.2, borderRadius: 0, flexShrink: 0, whiteSpace: "nowrap", boxShadow: "none",
            border: copied ? "1px solid rgba(122,232,160,0.3)" : "none",
            "&:hover": { bgcolor: copied ? "rgba(122,232,160,0.12)" : brandColor, filter: copied ? undefined : "brightness(1.1)" },
          }}
        >
          {copied ? "Link Copied!" : "Share Diary Link"}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress sx={{ color: brandColor }} thickness={2} />
        </Box>
      ) : subs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
          <MenuBookIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem", mb: 1 }}>
            No diary entries yet.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.18)", fontSize: "0.78rem" }}>
            Share the link above so your clients can start logging.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {subs.map(sub => {
            const mc = sub.entries?.length || 0;
            const date = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            return (
              <Box
                key={sub.id}
                onClick={() => setDetail(sub)}
                sx={{ bgcolor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", display: "flex", alignItems: "center", overflow: "hidden", transition: "border-color .2s", "&:hover": { borderColor: `${brandColor}50` } }}
              >
                <Box sx={{ width: 3, bgcolor: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                <Box sx={{ flex: 1, px: 2.5, py: 2 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.92rem" }}>{sub.clientName}</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>Week of {sub.weekOf || "—"}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem" }}>·</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>{mc} item{mc !== 1 ? "s" : ""}</Typography>
                    {date && <>
                      <Typography sx={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem" }}>·</Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>Submitted {date}</Typography>
                    </>}
                  </Stack>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, px: 1.5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Save PDF" placement="top">
                    <IconButton size="small" onClick={() => printPDF(sub)} sx={{ color: "rgba(255,255,255,0.28)", "&:hover": { color: brandColor } }}>
                      <PictureAsPdfIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete" placement="top">
                    <IconButton size="small" onClick={e => del(sub.id, e)} sx={{ color: "rgba(255,255,255,0.28)", "&:hover": { color: "#ff6b6b" } }}>
                      <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
