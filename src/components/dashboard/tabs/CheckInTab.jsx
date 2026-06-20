import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, TextField,
  CircularProgress, Tooltip, Paper,
} from "@mui/material";
import ShareIcon        from "@mui/icons-material/Share";
import ContentCopyIcon  from "@mui/icons-material/ContentCopy";
import DeleteIcon       from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import AddIcon          from "@mui/icons-material/Add";
import SaveIcon         from "@mui/icons-material/Save";
import AssignmentIcon   from "@mui/icons-material/Assignment";
import ListAltIcon      from "@mui/icons-material/ListAlt";
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";

function printPDF(sub) {
  const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";
  const qaRows = (sub.answers || []).map((a, i) => `
    <div class="qa">
      <div class="q"><span class="qnum">${i + 1}.</span> ${a.question || "Question"}</div>
      <div class="a">${a.answer || "—"}</div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Check-In – ${sub.clientName}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:36px 28px;color:#111}
      .hdr{border-bottom:3px solid #C9A84C;padding-bottom:10px;margin-bottom:6px}
      h1{font-size:26px;font-weight:normal;margin:0}
      .meta{font-family:sans-serif;font-size:12px;color:#888;margin-bottom:28px;margin-top:4px}
      .qa{margin-bottom:22px;page-break-inside:avoid}
      .q{font-family:sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;color:#555;margin-bottom:6px;display:flex;gap:6px}
      .qnum{color:#C9A84C;font-weight:700}
      .a{font-size:14px;line-height:1.7;padding:10px 14px;background:#faf8f4;border-left:3px solid #C9A84C}
      @media print{@page{margin:20px}}
    </style>
  </head><body>
    <div class="hdr"><h1>Weekly Check-In</h1></div>
    <p class="meta"><strong>${sub.clientName}</strong> &nbsp;·&nbsp; ${sub.date || "—"} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${qaRows}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused":  { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.1)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.22)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& textarea, & input": { "&::placeholder": { color: "rgba(255,255,255,0.18)", opacity: 1 } },
  };
}

const newQ = () => ({ id: `q-${Date.now()}-${Math.random()}`, text: "" });

export default function CheckInTab({ barber, brandColor }) {
  const [subView,    setSubView]    = useState("submissions"); // "questions" | "submissions" | "detail"
  const [questions,  setQuestions]  = useState([newQ()]);
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [savingQ,    setSavingQ]    = useState(false);
  const [detail,     setDetail]     = useState(null);
  const [copied,     setCopied]     = useState(false);

  const tid = barber?.uid || barber?.id;
  const fs  = fieldSx(brandColor);

  useEffect(() => { loadAll(); }, [tid]);

  async function loadAll() {
    if (!tid) return;
    setLoading(true);
    try {
      const [cfgSnap, subSnap] = await Promise.all([
        getDoc(doc(db, "barbers", tid, "config", "checkIn")),
        getDocs(collection(db, "barbers", tid, "checkInSubmissions")),
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
        doc(db, "barbers", tid, "config", "checkIn"),
        { questions: questions.map(q => ({ id: q.id, text: q.text })), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) { console.error(e); }
    finally     { setSavingQ(false); }
  }

  async function del(id, e) {
    e?.stopPropagation();
    if (!window.confirm("Delete this check-in submission?")) return;
    await deleteDoc(doc(db, "barbers", tid, "checkInSubmissions", id));
    setSubs(p => p.filter(s => s.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  function share() {
    navigator.clipboard.writeText(`${window.location.origin}/check-in/${tid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const validQs = questions.filter(q => q.text.trim());

  // ── Sub-view toggle header ─────────────────────────────────────────────────
  const Header = () => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
      <Box>
        <Typography sx={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 400 }}>
          Check-In Forms
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", mt: 0.5 }}>
          Build your check-in questions, share the link, and review client responses.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ display: "flex", border: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { id: "questions",    label: "Questions",    icon: <AddIcon sx={{ fontSize: 15 }} /> },
            { id: "submissions",  label: "Submissions",  icon: <ListAltIcon sx={{ fontSize: 15 }} /> },
          ].map(v => (
            <Button
              key={v.id}
              startIcon={v.icon}
              onClick={() => { setSubView(v.id); setDetail(null); }}
              sx={{
                bgcolor:    subView === v.id ? brandColor : "transparent",
                color:      subView === v.id ? "#0d0d0d"  : "rgba(255,255,255,0.4)",
                fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em",
                px: 2, py: 1, borderRadius: 0, boxShadow: "none",
                "&:hover": { bgcolor: subView === v.id ? brandColor : "rgba(255,255,255,0.06)" },
              }}
            >
              {v.label}
            </Button>
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
            "&:hover":    { bgcolor: copied ? undefined : "rgba(255,255,255,0.1)" },
            "&:disabled": { opacity: 0.35 },
          }}
        >
          {copied ? "Copied!" : "Share Form"}
        </Button>
      </Stack>
    </Box>
  );

  // ── Questions builder ──────────────────────────────────────────────────────
  if (subView === "questions") {
    return (
      <Box>
        <Header />
        <Box sx={{ maxWidth: 680 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", mb: 3 }}>
            Add the questions you want clients to answer in their weekly check-in. Save when done, then share the link.
          </Typography>
          <Stack spacing={2} sx={{ mb: 2 }}>
            {questions.map((q, idx) => (
              <Box key={q.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <Typography sx={{ color: brandColor, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", mt: 1.7, minWidth: 22, userSelect: "none" }}>
                  {String(idx + 1).padStart(2, "0")}
                </Typography>
                <TextField
                  fullWidth
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

          <Box>
            <Button
              startIcon={savingQ ? <CircularProgress size={13} sx={{ color: "#0d0d0d" }} /> : <SaveIcon sx={{ fontSize: 16 }} />}
              onClick={saveQuestions}
              disabled={savingQ || validQs.length === 0}
              sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.06em", px: 3, py: 1.3, borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.45 } }}
            >
              {savingQ ? "Saving…" : "Save Questions"}
            </Button>
            {validQs.length === 0 && (
              <Typography sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.73rem", mt: 1.5 }}>
                Add at least one question before saving.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Submission detail ──────────────────────────────────────────────────────
  if (detail) {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <IconButton onClick={() => setDetail(null)} sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0, color: "rgba(255,255,255,0.45)", "&:hover": { color: "#fff" } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.98rem" }}>{detail.clientName}</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.74rem" }}>{detail.date || "—"}</Typography>
          </Box>
          <Button
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 15 }} />}
            onClick={() => printPDF(detail)}
            sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", borderRadius: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", px: 2, py: 1, border: "1px solid rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }, boxShadow: "none" }}
          >
            Save PDF
          </Button>
        </Box>

        <Stack spacing={2} sx={{ maxWidth: 680 }}>
          {(detail.answers || []).map((a, i) => (
            <Box key={i} sx={{ bgcolor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.2)", display: "flex", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ color: brandColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.4 }}>
                  {a.question || "Question"}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, py: 2 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", fontWeight: 300, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {a.answer || <em style={{ opacity: 0.4 }}>No answer provided.</em>}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  // ── Submissions list ───────────────────────────────────────────────────────
  return (
    <Box>
      <Header />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress sx={{ color: brandColor }} thickness={2} />
        </Box>
      ) : subs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
          <AssignmentIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem", mb: 1 }}>
            No check-in submissions yet.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.18)", fontSize: "0.78rem" }}>
            {validQs.length === 0
              ? "Add your questions first, then share the form link with clients."
              : "Share the form link with your clients to get started."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {subs.map(sub => {
            const date = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            const ac   = sub.answers?.length || 0;
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
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>{sub.date || "—"}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem" }}>·</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem" }}>{ac} answer{ac !== 1 ? "s" : ""}</Typography>
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
