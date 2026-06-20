import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, TextField,
  CircularProgress, Tooltip, Chip,
} from "@mui/material";
import ShareIcon        from "@mui/icons-material/Share";
import ContentCopyIcon  from "@mui/icons-material/ContentCopy";
import DeleteIcon       from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import AddIcon          from "@mui/icons-material/Add";
import SaveIcon         from "@mui/icons-material/Save";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import ListAltIcon      from "@mui/icons-material/ListAlt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";

const DEFAULT_QUESTIONS = [
  { text: "Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?" },
  { text: "Do you feel pain in your chest when you do physical activity?" },
  { text: "In the past month, have you had chest pain when you were not doing physical activity?" },
  { text: "Do you lose your balance because of dizziness, or do you ever lose consciousness?" },
  { text: "Do you have a bone or joint problem that could be made worse by a change in your physical activity?" },
  { text: "Is your doctor currently prescribing drugs for your blood pressure or heart condition?" },
  { text: "Do you know of any other reason why you should not do physical activity?" },
];

function printPDF(sub) {
  const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";
  const hasFlags = (sub.answers || []).some(a => a.answer === "yes");

  const qaRows = (sub.answers || []).map((a, i) => {
    const flagged = a.answer === "yes";
    return `
    <div class="qa${flagged ? " flagged" : ""}">
      <div class="q"><span class="qnum">${i + 1}.</span> ${a.question || "Question"}</div>
      <div class="a-row">
        <span class="badge ${flagged ? "yes" : "no"}">${flagged ? "YES" : "NO"}</span>
        ${a.details ? `<span class="detail">${a.details}</span>` : ""}
      </div>
    </div>`;
  }).join("");

  const sigHtml = sub.signature
    ? `<div class="sig-section">
        <div class="sig-label">Client Signature</div>
        <img src="${sub.signature}" class="sig-img" alt="Signature" />
        <div class="sig-meta">${sub.clientName} &nbsp;·&nbsp; ${sub.date || "—"}</div>
       </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>PAR-Q – ${sub.clientName}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:36px 28px;color:#111}
      .hdr{border-bottom:3px solid #C9A84C;padding-bottom:10px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:flex-end}
      h1{font-size:22px;font-weight:normal;margin:0}
      .sub{font-size:11px;color:#888;letter-spacing:.08em;text-transform:uppercase}
      .meta{font-family:sans-serif;font-size:12px;color:#888;margin-bottom:24px;margin-top:6px}
      .flag-banner{background:#fff3cd;border-left:4px solid #e0a800;padding:8px 12px;margin-bottom:20px;font-family:sans-serif;font-size:12px;font-weight:700;color:#856404}
      .qa{margin-bottom:18px;page-break-inside:avoid;padding:10px 12px;background:#faf8f4}
      .qa.flagged{background:#fff8f0;border-left:3px solid #e0a800}
      .q{font-family:sans-serif;font-size:12px;font-weight:600;color:#444;margin-bottom:8px;display:flex;gap:6px;line-height:1.5}
      .qnum{color:#C9A84C;font-weight:700;flex-shrink:0}
      .a-row{display:flex;align-items:flex-start;gap:10px}
      .badge{font-family:sans-serif;font-size:10px;font-weight:900;letter-spacing:.1em;padding:3px 8px;border-radius:2px;flex-shrink:0}
      .badge.yes{background:#e0a800;color:#fff}
      .badge.no{background:#2e7d32;color:#fff}
      .detail{font-size:12px;color:#555;line-height:1.6;font-style:italic}
      .sig-section{margin-top:32px;padding-top:20px;border-top:1px solid #ddd}
      .sig-label{font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-bottom:8px}
      .sig-img{max-width:340px;border:1px solid #ddd;display:block;background:#fafafa;padding:4px}
      .sig-meta{font-family:sans-serif;font-size:11px;color:#aaa;margin-top:6px}
      @media print{@page{margin:20px}}
    </style>
  </head><body>
    <div class="hdr">
      <div>
        <h1>Physical Activity Readiness Questionnaire</h1>
        <div class="sub">PAR-Q Health Screening Form</div>
      </div>
    </div>
    <p class="meta"><strong>${sub.clientName}</strong> &nbsp;·&nbsp; DOB: ${sub.dob || "—"} &nbsp;·&nbsp; Date: ${sub.date || "—"} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${hasFlags ? '<div class="flag-banner">⚠ One or more health concerns flagged — please review before training.</div>' : ""}
    ${qaRows}
    ${sigHtml}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root":            { color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.1)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.22)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& textarea, & input": { "&::placeholder": { color: "rgba(255,255,255,0.18)", opacity: 1 } },
  };
}

const newQ = (text = "") => ({ id: `q-${Date.now()}-${Math.random()}`, text });

export default function ParQTab({ barber, brandColor }) {
  const [subView,   setSubView]   = useState("submissions");
  const [questions, setQuestions] = useState(() => DEFAULT_QUESTIONS.map(q => newQ(q.text)));
  const [subs,      setSubs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [savingQ,   setSavingQ]   = useState(false);
  const [detail,    setDetail]    = useState(null);
  const [copied,    setCopied]    = useState(false);

  const tid = barber?.uid || barber?.id;
  const fs  = fieldSx(brandColor);

  useEffect(() => { loadAll(); }, [tid]);

  async function loadAll() {
    if (!tid) return;
    setLoading(true);
    try {
      const [cfgSnap, subSnap] = await Promise.all([
        getDoc(doc(db, "barbers", tid, "config", "parQ")),
        getDocs(collection(db, "barbers", tid, "parQSubmissions")),
      ]);
      if (cfgSnap.exists() && cfgSnap.data().questions?.length) {
        setQuestions(cfgSnap.data().questions.map(q => ({ id: q.id || newQ().id, text: q.text || "" })));
      }
      setSubs(
        subSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
      );
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  }

  async function saveQuestions() {
    setSavingQ(true);
    try {
      await setDoc(
        doc(db, "barbers", tid, "config", "parQ"),
        { questions: questions.map(q => ({ id: q.id, text: q.text })), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) { console.error(e); }
    finally     { setSavingQ(false); }
  }

  async function del(id, e) {
    e?.stopPropagation();
    if (!window.confirm("Delete this PAR-Q submission?")) return;
    await deleteDoc(doc(db, "barbers", tid, "parQSubmissions", id));
    setSubs(p => p.filter(s => s.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  function share() {
    navigator.clipboard.writeText(`${window.location.origin}/par-q/${tid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const validQs = questions.filter(q => q.text.trim());

  // ── Header ──────────────────────────────────────────────────────────────────
  const Header = () => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
      <Box>
        <Typography sx={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 400 }}>
          PAR-Q Health Form
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", mt: 0.5 }}>
          Customise your health screening questions, share the link, and review signed submissions.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ display: "flex", border: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { id: "questions",   label: "Questions", icon: <AddIcon sx={{ fontSize: 15 }} /> },
            { id: "submissions", label: "Submissions", icon: <ListAltIcon sx={{ fontSize: 15 }} /> },
          ].map(v => (
            <Button key={v.id} startIcon={v.icon}
              onClick={() => { setSubView(v.id); setDetail(null); }}
              sx={{
                bgcolor:    subView === v.id ? brandColor : "transparent",
                color:      subView === v.id ? "#0d0d0d"  : "rgba(255,255,255,0.4)",
                fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em",
                px: 2, py: 1, borderRadius: 0, boxShadow: "none",
                "&:hover": { bgcolor: subView === v.id ? brandColor : "rgba(255,255,255,0.06)" },
              }}
            >{v.label}</Button>
          ))}
        </Box>
        <Button
          startIcon={copied ? <ContentCopyIcon sx={{ fontSize: 15 }} /> : <ShareIcon sx={{ fontSize: 15 }} />}
          onClick={share}
          disabled={validQs.length === 0}
          sx={{
            bgcolor: copied ? "rgba(122,232,160,0.12)" : "rgba(255,255,255,0.06)",
            color:   copied ? "#7ae8a0"                : "rgba(255,255,255,0.55)",
            fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em",
            px: 2, py: 1, borderRadius: 0, boxShadow: "none", whiteSpace: "nowrap",
            border: "1px solid",
            borderColor: copied ? "rgba(122,232,160,0.3)" : "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            "&:disabled": { opacity: 0.35 },
          }}
        >
          {copied ? "Copied!" : "Share Form"}
        </Button>
      </Stack>
    </Box>
  );

  // ── Question builder ──────────────────────────────────────────────────────
  if (subView === "questions") {
    return (
      <Box>
        <Header />
        <Box sx={{ maxWidth: 700 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", mb: 3, lineHeight: 1.7 }}>
            These are your PAR-Q health screening questions. Clients answer Yes or No to each one and can add details if needed. Pre-loaded with the standard 7 PAR-Q questions — edit or add your own.
          </Typography>
          <Stack spacing={2} sx={{ mb: 2 }}>
            {questions.map((q, idx) => (
              <Box key={q.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <Typography sx={{ color: brandColor, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", mt: 1.7, minWidth: 22, userSelect: "none" }}>
                  {String(idx + 1).padStart(2, "0")}
                </Typography>
                <TextField
                  fullWidth multiline minRows={2}
                  placeholder={`Question ${idx + 1}`}
                  value={q.text}
                  onChange={e => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))}
                  size="small"
                  sx={fs}
                />
                <IconButton
                  size="small"
                  onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}
                  disabled={questions.length === 1}
                  sx={{ color: "rgba(255,255,255,0.2)", mt: 0.5, "&:hover": { color: "#ff6b6b" }, "&:disabled": { opacity: 0.15 } }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>

          <Button
            startIcon={<AddIcon />}
            onClick={() => setQuestions(prev => [...prev, newQ()])}
            sx={{ mb: 3, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 0, color: "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.06em", px: 3, py: 1.2, "&:hover": { borderColor: brandColor, color: brandColor, bgcolor: `${brandColor}08` } }}
          >
            Add Question
          </Button>

          <Button
            startIcon={savingQ ? <CircularProgress size={13} sx={{ color: "#0d0d0d" }} /> : <SaveIcon sx={{ fontSize: 16 }} />}
            onClick={saveQuestions}
            disabled={savingQ || validQs.length === 0}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.06em", px: 3, py: 1.3, borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.45 } }}
          >
            {savingQ ? "Saving…" : "Save Questions"}
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Submission detail ─────────────────────────────────────────────────────
  if (detail) {
    const flags = (detail.answers || []).filter(a => a.answer === "yes");
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <IconButton onClick={() => setDetail(null)} sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0, color: "rgba(255,255,255,0.45)", "&:hover": { color: "#fff" } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.98rem" }}>{detail.clientName}</Typography>
              {flags.length > 0 && (
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: 13 }} />}
                  label={`${flags.length} health concern${flags.length !== 1 ? "s" : ""} flagged`}
                  size="small"
                  sx={{ bgcolor: "rgba(224,168,0,0.15)", color: "#e0a800", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.06em", border: "1px solid rgba(224,168,0,0.3)", borderRadius: 1, "& .MuiChip-icon": { color: "#e0a800" } }}
                />
              )}
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.74rem", mt: 0.25 }}>
              DOB: {detail.dob || "—"} &nbsp;·&nbsp; Date: {detail.date || "—"}
            </Typography>
          </Box>
          <Button
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 15 }} />}
            onClick={() => printPDF(detail)}
            sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", borderRadius: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", px: 2, py: 1, border: "1px solid rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }, boxShadow: "none" }}
          >
            Save PDF
          </Button>
        </Box>

        <Stack spacing={2} sx={{ maxWidth: 700, mb: 4 }}>
          {(detail.answers || []).map((a, i) => {
            const flagged = a.answer === "yes";
            return (
              <Box key={i} sx={{ bgcolor: "#1a1a1a", border: `1px solid ${flagged ? "rgba(224,168,0,0.3)" : "rgba(255,255,255,0.07)"}`, overflow: "hidden" }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.2)", display: "flex", gap: 1.5, alignItems: "baseline" }}>
                  <Typography sx={{ color: brandColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
                    {a.question}
                  </Typography>
                  <Chip
                    label={flagged ? "YES" : "NO"}
                    size="small"
                    sx={{
                      bgcolor: flagged ? "rgba(224,168,0,0.18)" : "rgba(46,125,50,0.18)",
                      color:   flagged ? "#e0a800" : "#66bb6a",
                      fontWeight: 900, fontSize: "0.62rem", letterSpacing: "0.1em",
                      border: `1px solid ${flagged ? "rgba(224,168,0,0.35)" : "rgba(46,125,50,0.35)"}`,
                      borderRadius: 0.5, flexShrink: 0,
                    }}
                  />
                </Box>
                {a.details && (
                  <Box sx={{ px: 2.5, py: 1.5 }}>
                    <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", fontWeight: 300, fontStyle: "italic", lineHeight: 1.7 }}>
                      {a.details}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Signature */}
        {detail.signature && (
          <Box sx={{ maxWidth: 420 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", mb: 1.5 }}>
              Client Signature
            </Typography>
            <Box sx={{ border: "1px solid rgba(255,255,255,0.1)", p: 1, bgcolor: "#fafafa", display: "inline-block" }}>
              <img src={detail.signature} alt="Signature" style={{ maxWidth: "100%", display: "block", maxHeight: 120 }} />
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", mt: 1 }}>
              Signed by {detail.clientName} on {detail.date || "—"}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // ── Submissions list ──────────────────────────────────────────────────────
  return (
    <Box>
      <Header />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress sx={{ color: brandColor }} thickness={2} />
        </Box>
      ) : subs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
          <HealthAndSafetyIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem", mb: 1 }}>
            No PAR-Q submissions yet.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.18)", fontSize: "0.78rem" }}>
            {validQs.length === 0
              ? "Save your questions first, then share the form link with clients."
              : "Share the form link with new clients before their first session."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {subs.map(sub => {
            const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            const flags     = (sub.answers || []).filter(a => a.answer === "yes").length;
            return (
              <Box
                key={sub.id}
                onClick={() => setDetail(sub)}
                sx={{ bgcolor: "#1a1a1a", border: `1px solid ${flags > 0 ? "rgba(224,168,0,0.25)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", display: "flex", alignItems: "center", overflow: "hidden", transition: "border-color .2s", "&:hover": { borderColor: `${brandColor}50` } }}
              >
                <Box sx={{ width: 3, bgcolor: flags > 0 ? "#e0a800" : brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                <Box sx={{ flex: 1, px: 2.5, py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.92rem" }}>{sub.clientName}</Typography>
                    {flags > 0 && (
                      <Chip
                        icon={<WarningAmberIcon sx={{ fontSize: 11 }} />}
                        label={`${flags} concern${flags !== 1 ? "s" : ""}`}
                        size="small"
                        sx={{ bgcolor: "rgba(224,168,0,0.12)", color: "#e0a800", fontWeight: 700, fontSize: "0.6rem", border: "1px solid rgba(224,168,0,0.25)", borderRadius: 0.5, "& .MuiChip-icon": { color: "#e0a800" } }}
                      />
                    )}
                    {sub.signature && (
                      <Chip label="Signed" size="small" sx={{ bgcolor: "rgba(46,125,50,0.12)", color: "#66bb6a", fontWeight: 700, fontSize: "0.6rem", border: "1px solid rgba(46,125,50,0.25)", borderRadius: 0.5 }} />
                    )}
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>DOB: {sub.dob || "—"}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem" }}>·</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>Date: {sub.date || "—"}</Typography>
                    {submitted && <>
                      <Typography sx={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem" }}>·</Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>Submitted {submitted}</Typography>
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
