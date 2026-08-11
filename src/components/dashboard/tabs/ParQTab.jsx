import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, TextField,
  CircularProgress, Tooltip, Chip, Paper, Alert,
} from "@mui/material";
import ShareIcon           from "@mui/icons-material/Share";
import ContentCopyIcon     from "@mui/icons-material/ContentCopy";
import DeleteIcon          from "@mui/icons-material/Delete";
import PictureAsPdfIcon    from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon       from "@mui/icons-material/ArrowBack";
import AddIcon             from "@mui/icons-material/Add";
import SaveIcon            from "@mui/icons-material/Save";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import ListAltIcon         from "@mui/icons-material/ListAlt";
import WarningAmberIcon    from "@mui/icons-material/WarningAmber";
import CheckCircleIcon     from "@mui/icons-material/CheckCircle";
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
      <div class="q"><span class="qnum">${i + 1}.</span> ${esc(a.question || "Question")}</div>
      <div class="a-row">
        <span class="badge ${flagged ? "yes" : "no"}">${flagged ? "YES" : "NO"}</span>
        ${a.details ? `<span class="detail">${esc(a.details)}</span>` : ""}
      </div>
    </div>`;
  }).join("");

  const sigHtml = sub.signature
    ? `<div class="sig-section">
        <div class="sig-label">Client Signature</div>
        <img src="${sub.signature}" class="sig-img" alt="Signature" />
        <div class="sig-meta">${esc(sub.clientName)} &nbsp;·&nbsp; ${esc(sub.date || "—")}</div>
       </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>PAR-Q – ${esc(sub.clientName)}</title>
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
    <p class="meta"><strong>${esc(sub.clientName)}</strong> &nbsp;·&nbsp; DOB: ${esc(sub.dob || "—")} &nbsp;·&nbsp; Date: ${esc(sub.date || "—")} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${hasFlags ? '<div class="flag-banner">⚠ One or more health concerns flagged — please review before training.</div>' : ""}
    ${qaRows}
    ${sigHtml}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

const newQ = (text = "") => ({ id: `q-${Date.now()}-${Math.random()}`, text });

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default function ParQTab({ barber, brandColor }) {
  const [subView,   setSubView]   = useState("submissions");
  const [questions, setQuestions] = useState(() => DEFAULT_QUESTIONS.map(q => newQ(q.text)));
  const [subs,      setSubs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [savingQ,   setSavingQ]   = useState(false);
  const [detail,    setDetail]    = useState(null);
  const [copied,    setCopied]    = useState(false);

  const tid = barber?.uid || barber?.id;

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
  const parqLink = `${window.location.origin}/par-q/${tid}`;

  // ── Header ──────────────────────────────────────────────────────────────────
  const Header = () => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>PAR-Q Health Screening</Typography>
          <Typography variant="body2" color="text.secondary">
            Customise your questions, share the link with clients, and review signed submissions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Button
            variant={subView === "questions" ? "contained" : "outlined"}
            startIcon={<AddIcon />}
            size="small"
            onClick={() => { setSubView("questions"); setDetail(null); }}
            sx={subView === "questions" ? { bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } } : {}}
          >
            Questions
          </Button>
          <Button
            variant={subView === "submissions" ? "contained" : "outlined"}
            startIcon={<ListAltIcon />}
            size="small"
            onClick={() => { setSubView("submissions"); setDetail(null); }}
            sx={subView === "submissions" ? { bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } } : {}}
          >
            Submissions
          </Button>
        </Stack>
      </Box>

      {/* Send link banner */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", bgcolor: copied ? "#f0fdf4" : "#fafafa", borderColor: copied ? "success.light" : "divider", transition: "all .2s" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
            PAR-Q form link — send this to new clients before their first session
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
            {parqLink}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
          onClick={share}
          disabled={validQs.length === 0}
          color={copied ? "success" : "primary"}
          size="small"
          sx={!copied ? { bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } } : {}}
        >
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </Paper>
      {validQs.length === 0 && (
        <Alert severity="info" sx={{ mt: 1 }}>Save your questions first before sharing the form.</Alert>
      )}
    </Box>
  );

  // ── Question builder ──────────────────────────────────────────────────────
  if (subView === "questions") {
    return (
      <Box>
        <Header />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pre-loaded with the standard 7 PAR-Q questions. Edit or add your own — clients answer Yes/No and can add details.
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 2, maxWidth: 720 }}>
          {questions.map((q, idx) => (
            <Box key={q.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Typography variant="caption" sx={{ color: brandColor, fontWeight: 700, mt: 1.5, minWidth: 24 }}>
                {String(idx + 1).padStart(2, "0")}
              </Typography>
              <TextField
                fullWidth multiline minRows={2}
                placeholder={`Question ${idx + 1}`}
                value={q.text}
                onChange={e => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))}
                size="small"
              />
              <IconButton
                size="small"
                onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}
                disabled={questions.length === 1}
                sx={{ mt: 0.5, color: "text.disabled", "&:hover": { color: "error.main" } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setQuestions(prev => [...prev, newQ()])}
          >
            Add Question
          </Button>
          <Button
            variant="contained"
            startIcon={savingQ ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={saveQuestions}
            disabled={savingQ || validQs.length === 0}
            sx={{ bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
          >
            {savingQ ? "Saving…" : "Save Questions"}
          </Button>
        </Stack>
      </Box>
    );
  }

  // ── Submission detail ─────────────────────────────────────────────────────
  if (detail) {
    const flags = (detail.answers || []).filter(a => a.answer === "yes");
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setDetail(null)} size="small">
            Back
          </Button>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
              <Typography variant="h6" fontWeight={700}>{detail.clientName}</Typography>
              {flags.length > 0 && (
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                  label={`${flags.length} health concern${flags.length !== 1 ? "s" : ""} flagged`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              DOB: {detail.dob || "—"} · Date: {detail.date || "—"}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => printPDF(detail)} size="small">
            Save PDF
          </Button>
        </Box>

        <Stack spacing={1.5} sx={{ maxWidth: 720, mb: 3 }}>
          {(detail.answers || []).map((a, i) => {
            const flagged = a.answer === "yes";
            return (
              <Paper key={i} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderColor: flagged ? "warning.light" : "divider" }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: flagged ? "#fffbeb" : "#fafafa", display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Typography variant="caption" sx={{ color: brandColor, fontWeight: 700, flexShrink: 0, mt: 0.25 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, lineHeight: 1.5 }}>
                    {a.question}
                  </Typography>
                  <Chip
                    label={flagged ? "YES" : "NO"}
                    size="small"
                    sx={{
                      bgcolor: flagged ? "warning.light" : "success.light",
                      color:   flagged ? "warning.dark"  : "success.dark",
                      fontWeight: 900, fontSize: "0.65rem", flexShrink: 0,
                    }}
                  />
                </Box>
                {a.details && (
                  <Box sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">{a.details}</Typography>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Stack>

        {detail.signature && (
          <Box sx={{ maxWidth: 420 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
              Client Signature
            </Typography>
            <Box sx={{ border: "1px solid", borderColor: "divider", p: 1, bgcolor: "#fff", display: "inline-block", borderRadius: 1 }}>
              <img src={detail.signature} alt="Signature" style={{ maxWidth: "100%", display: "block", maxHeight: 120 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
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
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : subs.length === 0 ? (
        <Paper variant="outlined" sx={{ textAlign: "center", py: 6, borderRadius: 2, borderStyle: "dashed" }}>
          <HealthAndSafetyIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" color="text.secondary" mb={0.5}>No PAR-Q submissions yet.</Typography>
          <Typography variant="caption" color="text.disabled">
            {validQs.length === 0
              ? "Save your questions first, then share the form link with clients."
              : "Copy the link above and send it to new clients before their first session."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {subs.map(sub => {
            const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            const flags     = (sub.answers || []).filter(a => a.answer === "yes").length;
            return (
              <Paper
                key={sub.id}
                variant="outlined"
                onClick={() => setDetail(sub)}
                sx={{ display: "flex", alignItems: "center", cursor: "pointer", borderRadius: 2, overflow: "hidden", borderColor: flags > 0 ? "warning.light" : "divider", "&:hover": { borderColor: brandColor, boxShadow: 1 }, transition: "all .15s" }}
              >
                <Box sx={{ width: 4, bgcolor: flags > 0 ? "warning.main" : brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                <Box sx={{ flex: 1, px: 2, py: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                    <Typography variant="body2" fontWeight={700}>{sub.clientName}</Typography>
                    {flags > 0 && (
                      <Chip
                        icon={<WarningAmberIcon sx={{ fontSize: 12 }} />}
                        label={`${flags} concern${flags !== 1 ? "s" : ""}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                    {sub.signature && (
                      <Chip label="Signed" size="small" color="success" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    DOB: {sub.dob || "—"} · Date: {sub.date || "—"}{submitted ? ` · Submitted ${submitted}` : ""}
                  </Typography>
                </Box>
                <Stack direction="row" sx={{ px: 1, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Save PDF" placement="top">
                    <IconButton size="small" onClick={() => printPDF(sub)}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete" placement="top">
                    <IconButton size="small" onClick={e => del(sub.id, e)} sx={{ "&:hover": { color: "error.main" } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
