import React, { useState, useRef, useEffect, useMemo } from "react";
import { Box, Typography, IconButton, TextField, CircularProgress, Fab, Button, useMediaQuery } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubbleRounded";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { AUDIENCE_RULES, DEFAULT_GREETING, greetingForAudience } from "../config/botFacts";

const BRAND = "#2563EB";
const SESSION_KEY = "br_chat_session_id";
const AUTOOPEN_KEY = "br_chat_autoopened"; // once per browser session (sessionStorage)
const DISMISSED_KEY = "br_chat_dismissed"; // visitor explicitly closed it — never auto-open again this session

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return null; }
}

// Checks the full URL for audience signals, not just utm_content/utm_campaign
// — matches the Worker's own detectAudience() keyword rules so the greeting
// and the audience value sent to /api/chat always agree.
function detectAudienceFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const haystack = [params.get("utm_content"), params.get("utm_campaign"), window.location.pathname].filter(Boolean).join(" ");
  for (const rule of AUDIENCE_RULES) if (rule.test.test(haystack)) return rule.id;
  return null;
}

function logEvent(sessionId, event, extra = {}) {
  if (!sessionId) return;
  fetch("/api/chat-event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, event, ...extra }),
  }).catch(() => {});
}

// Floating homepage chat widget backed by POST /api/chat (Cloudflare Workers
// AI, falling back to a hardcoded matcher server-side — this component
// doesn't need to know which one answered, just render the reply).
export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [startFreeUrl, setStartFreeUrl] = useState(null);
  const [teaser, setTeaser]     = useState(false);
  const isMobile = useMediaQuery("(max-width:599.95px)");

  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const audience  = useMemo(() => detectAudienceFromLocation(), []);
  const utm = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return { utmSource: p.get("utm_source") || "", utmCampaign: p.get("utm_campaign") || "", utmContent: p.get("utm_content") || "" };
  }, []);

  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: audience ? greetingForAudience(audience) : DEFAULT_GREETING },
  ]);

  const listRef = useRef(null);

  // Track the real visible area on mobile — window.innerHeight/vh units
  // don't shrink when the on-screen keyboard opens on iOS/Android, so a
  // panel sized off them either gets covered by the keyboard or pushed
  // off-screen. visualViewport reports the actual visible rect, keeping
  // the panel (header + input) always on screen while typing.
  const [viewport, setViewport] = useState(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    top: 0,
  }));

  useEffect(() => {
    if (!open || !isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // Proactive opening: once per browser session, 10s after load, unless the
  // visitor already dismissed the bubble this session. On mobile this shows
  // a small teaser instead of opening the full panel (opening full-screen
  // unprompted on a phone is a much bigger interruption than a desktop
  // corner panel).
  useEffect(() => {
    let alreadyOpened = false, dismissed = false;
    try {
      alreadyOpened = sessionStorage.getItem(AUTOOPEN_KEY) === "1";
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    if (alreadyOpened || dismissed) return undefined;

    const t = setTimeout(() => {
      try { sessionStorage.setItem(AUTOOPEN_KEY, "1"); } catch {}
      if (isMobile) {
        setTeaser(true);
        logEvent(sessionId, "opened", { openedAs: "teaser", audience, ...utm, landingPath: window.location.pathname });
      } else {
        setOpen(true);
        logEvent(sessionId, "opened", { openedAs: "auto", audience, ...utm, landingPath: window.location.pathname });
      }
    }, 10000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    setTeaser(false);
    if (next) {
      logEvent(sessionId, "opened", { openedAs: "manual", audience, ...utm, landingPath: window.location.pathname });
    } else {
      try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch {}
      logEvent(sessionId, "closed");
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          sessionId, audience, ...utm, landingPath: window.location.pathname,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Sorry, something went wrong — try again in a moment." }]);
      setStartFreeUrl(data.startFreeUrl || null);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong — try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  function handleStartFree() {
    logEvent(sessionId, "clicked_start_free", { audience, ...utm });
    window.location.href = startFreeUrl || `/signup?sessionId=${encodeURIComponent(sessionId || "")}`;
  }

  return (
    <>
      {teaser && !open && (
        <Box
          onClick={() => { setTeaser(false); handleToggle(); }}
          sx={{
            position: "fixed", zIndex: 1300, right: 12, bottom: 84,
            maxWidth: 220, bgcolor: "#fff", color: "#111116",
            borderRadius: "14px 14px 2px 14px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            px: 1.75, py: 1.25, fontSize: "0.8rem", lineHeight: 1.4, cursor: "pointer",
            border: "1px solid #eee",
          }}
        >
          {audience ? greetingForAudience(audience) : DEFAULT_GREETING}
        </Box>
      )}

      {open && (
        <Box sx={isMobile ? {
          position: "fixed", zIndex: 1300,
          left: 0, right: 0,
          top: viewport.top,
          height: viewport.height,
          width: "100%",
          bgcolor: "#fff", borderRadius: 0,
          boxShadow: "none",
          display: "flex", flexDirection: "column", overflow: "hidden",
        } : {
          position: "fixed", zIndex: 1300,
          right: 24, bottom: 96,
          width: 360,
          height: 480,
          bgcolor: "#fff", borderRadius: "16px 16px 4px 16px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid #e5e5e5",
        }}>
          <Box sx={{ bgcolor: "#111116", color: "#fff", px: 2, py: 1.5, pt: isMobile ? "calc(12px + env(safe-area-inset-top, 0px))" : 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Bookrightly Assistant</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>Usually replies instantly</Typography>
            </Box>
            <IconButton size="small" onClick={handleToggle} sx={{ color: "rgba(255,255,255,0.7)" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box ref={listRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.5, py: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <Box sx={{
                  maxWidth: "82%", px: 1.75, py: 1, borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  bgcolor: m.role === "user" ? BRAND : "#f2f2f4",
                  color: m.role === "user" ? "#fff" : "#111116",
                  fontSize: "0.85rem", lineHeight: 1.5,
                }}>
                  {m.content}
                </Box>
              </Box>
            ))}
            {sending && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Box sx={{ px: 1.75, py: 1, borderRadius: "12px 12px 12px 2px", bgcolor: "#f2f2f4" }}>
                  <CircularProgress size={14} sx={{ color: "#8A8A91" }} />
                </Box>
              </Box>
            )}
            {startFreeUrl && !sending && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Button onClick={handleStartFree} variant="contained" size="small" sx={{ bgcolor: BRAND, fontWeight: 700, borderRadius: "999px", "&:hover": { bgcolor: BRAND } }}>
                  Start free
                </Button>
              </Box>
            )}
          </Box>

          <Box component="form" onSubmit={handleSend} sx={{ display: "flex", gap: 1, p: 1.25, pb: isMobile ? "calc(10px + env(safe-area-inset-bottom, 0px))" : 1.25, borderTop: "1px solid #eee", flexShrink: 0 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              size="small"
              fullWidth
              inputProps={{ maxLength: 500, style: { fontSize: 16 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            />
            <IconButton type="submit" disabled={sending || !input.trim()} sx={{ bgcolor: BRAND, color: "#fff", "&:hover": { bgcolor: BRAND }, "&.Mui-disabled": { bgcolor: "#e5e5e5" } }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {!(open && isMobile) && (
        <Fab
          onClick={handleToggle}
          sx={{
            position: "fixed", zIndex: 1300,
            right: { xs: 12, sm: 24 }, bottom: { xs: 20, sm: 28 },
            bgcolor: "#111116", color: "#fff",
            "&:hover": { bgcolor: "#111116", opacity: 0.9 },
          }}
          aria-label="Chat with Bookrightly"
        >
          {open ? <CloseIcon /> : <ChatBubbleIcon />}
        </Fab>
      )}
    </>
  );
}
