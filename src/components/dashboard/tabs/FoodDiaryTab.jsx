import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, Chip, Paper,
  CircularProgress, Tooltip,
} from "@mui/material";
import DeleteIcon         from "@mui/icons-material/Delete";
import PictureAsPdfIcon   from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon      from "@mui/icons-material/ArrowBack";
import MenuBookIcon       from "@mui/icons-material/MenuBook";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase/config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TYPE_COLOUR = {
  Breakfast: "#b8860b", Lunch: "#1976d2", Dinner: "#7b1fa2",
  Snack: "#2e7d32", Drink: "#c62828", Other: "#555",
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
            <span class="time">${esc(m.time || "—")}</span>
            <span class="type">${esc(m.type || "—")}</span>
            <span class="desc">${esc(m.description || "—")}</span>
            ${m.amount ? `<span class="amount">${esc(m.amount)}</span>` : ""}
          </div>`).join("")}
      </div>`;
  }).join("");

  const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Food Diary – ${esc(sub.clientName)}</title>
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
      .amount{font-family:sans-serif;font-size:11px;font-weight:700;color:#555;flex-shrink:0;padding-top:1px;min-width:64px;text-align:right}
      @media print{@page{margin:20px}}
    </style>
  </head><body>
    <div class="hdr"><h1>Food Diary</h1></div>
    <p class="meta"><strong>${esc(sub.clientName)}</strong> &nbsp;·&nbsp; Week of ${esc(sub.weekOf || "—")} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${rows}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default function FoodDiaryTab({ barber, brandColor }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);

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

  // ── Detail view ────────────────────────────────────────────────────────────
  if (detail) {
    const activeDays = DAYS.filter(d => (detail.entries || []).some(e => e.day === d));
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <IconButton onClick={() => setDetail(null)} size="small" sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.98rem", color: "text.primary" }}>{detail.clientName}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.74rem" }}>Week of {detail.weekOf || "—"}</Typography>
          </Box>
          <Button
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 15 }} />}
            onClick={() => printPDF(detail)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, boxShadow: "none" }}
          >
            Save PDF
          </Button>
        </Box>

        <Stack spacing={2.5}>
          {activeDays.length === 0 && (
            <Typography sx={{ color: "text.disabled", textAlign: "center", py: 4 }}>No meals logged.</Typography>
          )}
          {activeDays.map(day => {
            const meals = (detail.entries || []).filter(e => e.day === day);
            return (
              <Box key={day}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                  <Box sx={{ width: 3, height: 14, bgcolor: brandColor, flexShrink: 0, borderRadius: 1 }} />
                  <Typography sx={{ color: brandColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{day}</Typography>
                </Box>
                <Stack spacing={0.75}>
                  {meals.map((m, i) => (
                    <Paper key={i} variant="outlined" sx={{ px: 2.5, py: 1.4, borderRadius: "8px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={{ color: "text.disabled", fontSize: "0.78rem", fontFamily: "monospace", width: 44, flexShrink: 0 }}>
                          {m.time || "—"}
                        </Typography>
                        <Chip
                          label={m.type || "Other"}
                          size="small"
                          sx={{ bgcolor: `${TYPE_COLOUR[m.type] || TYPE_COLOUR.Other}18`, color: TYPE_COLOUR[m.type] || TYPE_COLOUR.Other, fontSize: "0.6rem", fontWeight: 700, height: 20, letterSpacing: "0.04em", minWidth: 72 }}
                        />
                        <Typography sx={{ color: "text.primary", fontSize: "0.88rem", flex: 1, lineHeight: 1.5 }}>
                          {m.description || "—"}
                        </Typography>
                        {m.amount && (
                          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", fontWeight: 600, flexShrink: 0, ml: 1 }}>
                            {m.amount}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", mb: 0.5 }}>
          Food Diary
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Client food diary submissions appear here. Clients submit from their portal.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: brandColor }} thickness={2} size={32} />
        </Box>
      ) : subs.length === 0 ? (
        <Paper variant="outlined" sx={{ textAlign: "center", py: 8, borderRadius: "12px", borderStyle: "dashed" }}>
          <MenuBookIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1.5 }} />
          <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", mb: 0.5 }}>
            No diary entries yet.
          </Typography>
          <Typography sx={{ color: "text.disabled", fontSize: "0.78rem" }}>
            Clients log their meals from their portal.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {subs.map(sub => {
            const mc   = sub.entries?.length || 0;
            const date = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            return (
              <Paper
                key={sub.id}
                variant="outlined"
                onClick={() => setDetail(sub)}
                sx={{ cursor: "pointer", display: "flex", alignItems: "center", overflow: "hidden", borderRadius: "10px", transition: "border-color .2s, box-shadow .2s", "&:hover": { borderColor: brandColor, boxShadow: `0 0 0 1px ${brandColor}44` } }}
              >
                <Box sx={{ width: 3, bgcolor: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                <Box sx={{ flex: 1, px: 2.5, py: 1.75 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary" }}>{sub.clientName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>Week of {sub.weekOf || "—"}</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>·</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>{mc} item{mc !== 1 ? "s" : ""}</Typography>
                    {date && (
                      <>
                        <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>·</Typography>
                        <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>Submitted {date}</Typography>
                      </>
                    )}
                  </Stack>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, px: 1.5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Save PDF" placement="top">
                    <IconButton size="small" onClick={() => printPDF(sub)} sx={{ color: "text.disabled", "&:hover": { color: brandColor } }}>
                      <PictureAsPdfIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete" placement="top">
                    <IconButton size="small" onClick={e => del(sub.id, e)} sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
                      <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
