import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Stack, TextField,
  CircularProgress, Tooltip, Paper, MenuItem, Select, FormControl, InputLabel, Chip,
} from "@mui/material";
import ContentCopyIcon  from "@mui/icons-material/ContentCopy";
import DeleteIcon       from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import AddIcon          from "@mui/icons-material/Add";
import SaveIcon         from "@mui/icons-material/Save";
import AssignmentIcon   from "@mui/icons-material/Assignment";
import ListAltIcon      from "@mui/icons-material/ListAlt";
import SendIcon         from "@mui/icons-material/Send";
import WhatsAppIcon     from "@mui/icons-material/WhatsApp";
import CheckCircleIcon  from "@mui/icons-material/CheckCircle";
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { getClientsList } from "../../../firebase/firestore";

function printPDF(sub) {
  const submitted = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";
  const qaRows = (sub.answers || []).map((a, i) => `
    <div class="qa">
      <div class="q"><span class="qnum">${i + 1}.</span> ${esc(a.question || "Question")}</div>
      <div class="a">${esc(a.answer || "—")}</div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Check-In – ${esc(sub.clientName)}</title>
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
    <p class="meta"><strong>${esc(sub.clientName)}</strong> &nbsp;·&nbsp; ${esc(sub.date || "—")} &nbsp;·&nbsp; Submitted ${submitted}</p>
    ${qaRows}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

const newQ = () => ({ id: `q-${Date.now()}-${Math.random()}`, text: "" });

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default function CheckInTab({ barber, brandColor }) {
  const [subView,    setSubView]    = useState("questions"); // "questions" | "submissions" | "send" | "detail"
  const [questions,  setQuestions]  = useState([newQ()]);
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [savingQ,    setSavingQ]    = useState(false);
  const [savedQ,     setSavedQ]     = useState(false);
  const [detail,     setDetail]     = useState(null);
  const [clients,    setClients]    = useState([]);
  const [selClient,  setSelClient]  = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const tid = barber?.uid || barber?.id;

  useEffect(() => { loadAll(); }, [tid]);

  async function loadAll() {
    if (!tid) return;
    setLoading(true);
    try {
      const [cfgSnap, subSnap, clientList] = await Promise.all([
        getDoc(doc(db, "barbers", tid, "config", "checkIn")),
        getDocs(collection(db, "barbers", tid, "checkInSubmissions")),
        getClientsList(tid),
      ]);
      if (cfgSnap.exists() && cfgSnap.data().questions?.length) {
        setQuestions(cfgSnap.data().questions.map(q => ({ id: q.id || newQ().id, text: q.text || "" })));
      }
      setSubs(
        subSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
      );
      setClients(clientList);
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
      setSavedQ(true);
      setTimeout(() => setSavedQ(false), 2500);
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

  const validQs = questions.filter(q => q.text.trim());

  // ── Tab toggle header ──────────────────────────────────────────────────────
  const Header = () => (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", mb: 0.5 }}>
        Check-In Forms
      </Typography>
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 2.5 }}>
        Build your weekly check-in questions, then send the client portal link to each client.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {[
          { id: "questions",   label: "Questions",      icon: <AddIcon sx={{ fontSize: 15 }} /> },
          { id: "submissions", label: "Submissions",    icon: <ListAltIcon sx={{ fontSize: 15 }} />, badge: subs.length },
          { id: "send",        label: "Send to Client", icon: <SendIcon sx={{ fontSize: 15 }} /> },
        ].map(v => (
          <Button
            key={v.id}
            size="small"
            startIcon={v.icon}
            onClick={() => { setSubView(v.id); setDetail(null); }}
            variant={subView === v.id ? "contained" : "outlined"}
            sx={{
              bgcolor:    subView === v.id ? brandColor : "transparent",
              color:      subView === v.id ? "#fff"     : "text.secondary",
              borderColor: subView === v.id ? brandColor : "divider",
              fontWeight: 600, fontSize: "0.75rem", borderRadius: "8px",
              boxShadow: "none", px: 2, py: 0.8,
              "&:hover": {
                bgcolor:    subView === v.id ? brandColor : "action.hover",
                borderColor: brandColor,
                boxShadow: "none",
              },
            }}
          >
            {v.label}
            {v.badge > 0 && (
              <Chip
                label={v.badge}
                size="small"
                sx={{ ml: 1, height: 18, fontSize: "0.65rem", bgcolor: subView === v.id ? "rgba(255,255,255,0.25)" : `${brandColor}22`, color: subView === v.id ? "#fff" : brandColor, fontWeight: 700 }}
              />
            )}
          </Button>
        ))}
      </Stack>
    </Box>
  );

  // ── Questions builder ──────────────────────────────────────────────────────
  if (subView === "questions") {
    return (
      <Box>
        <Header />
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2.5 }}>
          Add the questions you want clients to answer each week. Save when done, then use <strong>Send to Client</strong> to share their portal link.
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 2, maxWidth: 640 }}>
          {questions.map((q, idx) => (
            <Box key={q.id} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Typography sx={{ color: brandColor, fontSize: "0.7rem", fontWeight: 700, minWidth: 22, flexShrink: 0 }}>
                {String(idx + 1).padStart(2, "0")}
              </Typography>
              <TextField
                fullWidth
                placeholder={`e.g. How did your training feel this week?`}
                value={q.text}
                onChange={e => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))}
                size="small"
                variant="outlined"
              />
              <IconButton
                size="small"
                onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}
                disabled={questions.length === 1}
                sx={{ color: "text.disabled", "&:hover": { color: "error.main" }, "&:disabled": { opacity: 0.3 } }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setQuestions(prev => [...prev, newQ()])}
          variant="outlined"
          sx={{ mb: 3, borderStyle: "dashed", borderColor: "divider", color: "text.secondary", borderRadius: "8px", fontWeight: 600, fontSize: "0.78rem", "&:hover": { borderColor: brandColor, color: brandColor, borderStyle: "dashed", bgcolor: `${brandColor}08` } }}
        >
          Add Question
        </Button>

        <Box>
          <Button
            startIcon={savedQ ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : savingQ ? <CircularProgress size={13} /> : <SaveIcon sx={{ fontSize: 16 }} />}
            onClick={saveQuestions}
            disabled={savingQ || validQs.length === 0}
            variant="contained"
            sx={{ bgcolor: savedQ ? "#4caf50" : brandColor, color: "#fff", fontWeight: 700, fontSize: "0.8rem", borderRadius: "8px", boxShadow: "none", px: 3, py: 1.1, "&:hover": { bgcolor: savedQ ? "#4caf50" : brandColor, filter: "brightness(0.92)", boxShadow: "none" }, "&:disabled": { opacity: 0.5 } }}
          >
            {savedQ ? "Saved!" : savingQ ? "Saving…" : "Save Questions"}
          </Button>
          {validQs.length === 0 && (
            <Typography sx={{ color: "text.disabled", fontSize: "0.75rem", mt: 1.5 }}>
              Add at least one question before saving.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // ── Send to Client ─────────────────────────────────────────────────────────
  if (subView === "send") {
    const selectedClient = clients.find(c => c.id === selClient);
    const portalUrl = selClient
      ? `${window.location.origin}/client-portal/${tid}/${selClient}`
      : "";

    function copyPortalLink() {
      if (!portalUrl) return;
      navigator.clipboard.writeText(portalUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    }

    function whatsappPortalLink() {
      if (!portalUrl) return;
      const name = selectedClient?.customerName || selectedClient?.name || "there";
      const msg = encodeURIComponent(
        `Hi ${name}, here's your check-in link — fill it in whenever you're ready:\n${portalUrl}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }

    return (
      <Box>
        <Header />
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2.5, maxWidth: 540 }}>
          Select a client to get their personal portal link. Send it to them and they'll be able to fill in the check-in straight from their portal.
        </Typography>

        <Box sx={{ maxWidth: 480 }}>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>Select Client</InputLabel>
            <Select
              value={selClient}
              label="Select Client"
              onChange={e => setSelClient(e.target.value)}
            >
              {clients.length === 0 && (
                <MenuItem disabled value=""><em>No clients found — add clients first</em></MenuItem>
              )}
              {clients.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.customerName || c.name || c.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {portalUrl && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: "10px", bgcolor: `${brandColor}08`, borderColor: `${brandColor}44` }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: brandColor, mb: 1 }}>
                Client Portal Link
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.6 }}>
                {portalUrl}
              </Typography>
            </Paper>
          )}

          {portalUrl && (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={linkCopied ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
                onClick={copyPortalLink}
                variant="contained"
                sx={{ bgcolor: linkCopied ? "#4caf50" : brandColor, color: "#fff", fontWeight: 700, fontSize: "0.78rem", borderRadius: "8px", boxShadow: "none", px: 2.5, py: 1, "&:hover": { filter: "brightness(0.92)", boxShadow: "none" } }}
              >
                {linkCopied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                startIcon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                onClick={whatsappPortalLink}
                variant="outlined"
                sx={{ color: "#25d366", borderColor: "#25d36644", fontWeight: 700, fontSize: "0.78rem", borderRadius: "8px", boxShadow: "none", px: 2.5, py: 1, "&:hover": { bgcolor: "rgba(37,211,102,0.08)", borderColor: "#25d366", boxShadow: "none" } }}
              >
                Send via WhatsApp
              </Button>
            </Stack>
          )}

          {!portalUrl && clients.length > 0 && (
            <Typography sx={{ color: "text.disabled", fontSize: "0.82rem" }}>
              Select a client above to see their link.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // ── Submission detail ──────────────────────────────────────────────────────
  if (detail) {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <IconButton onClick={() => setDetail(null)} size="small" sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.98rem", color: "text.primary" }}>{detail.clientName}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.74rem" }}>{detail.date || "—"}</Typography>
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

        <Stack spacing={1.5} sx={{ maxWidth: 680 }}>
          {(detail.answers || []).map((a, i) => (
            <Paper key={i} variant="outlined" sx={{ borderRadius: "10px", overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider", display: "flex", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ color: brandColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.4 }}>
                  {a.question || "Question"}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, py: 2 }}>
                <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {a.answer || <em style={{ opacity: 0.5 }}>No answer provided.</em>}
                </Typography>
              </Box>
            </Paper>
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
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: brandColor }} thickness={2} size={32} />
        </Box>
      ) : subs.length === 0 ? (
        <Paper variant="outlined" sx={{ textAlign: "center", py: 8, borderRadius: "12px", borderStyle: "dashed" }}>
          <AssignmentIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1.5 }} />
          <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", mb: 0.5 }}>
            No check-in submissions yet.
          </Typography>
          <Typography sx={{ color: "text.disabled", fontSize: "0.78rem" }}>
            {validQs.length === 0
              ? "Add your questions first, then send the portal link to your clients."
              : "Send the portal link to your clients to get started."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {subs.map(sub => {
            const date = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) || "";
            const ac   = sub.answers?.length || 0;
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
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>{sub.date || "—"}</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>·</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: "0.72rem" }}>{ac} answer{ac !== 1 ? "s" : ""}</Typography>
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
