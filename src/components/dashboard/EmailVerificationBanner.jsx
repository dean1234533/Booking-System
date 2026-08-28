import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { sendEmailVerification } from "firebase/auth";

const DISMISSED_KEY = "email_verify_banner_dismissed";
// Without this, the verification link dead-ends on a bare, unbranded
// Firebase confirmation page with no way back to the actual site.
const EMAIL_VERIFICATION_SETTINGS = { url: "https://bookrightly.co.uk/dashboard" };

// Soft nag, not a hard gate — dashboard access still works while unverified,
// since blocking it outright would strand someone mid-onboarding before
// they've had a chance to check their inbox. Dismissible per session; comes
// back next session until the account is actually verified.
export default function EmailVerificationBanner({ user, brandColor = "#2563EB" }) {
  const [visible, setVisible] = useState(
    !!user && !user.emailVerified && !sessionStorage.getItem(DISMISSED_KEY)
  );
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // user.emailVerified on the SDK's cached user object never updates on its
  // own — clicking the link verifies the account server-side, but this tab
  // has no idea unless it explicitly re-checks. Without this the banner
  // just keeps nagging forever even right after successfully verifying,
  // which reads as "the link doesn't even work".
  useEffect(() => {
    if (!user || user.emailVerified) return;
    const check = () => {
      user.reload().then(() => {
        if (user.emailVerified) setVisible(false);
      }).catch(() => {});
    };
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [user]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleResend = async () => {
    setSending(true);
    setSendError("");
    try {
      await sendEmailVerification(user, EMAIL_VERIFICATION_SETTINGS);
      setSent(true);
    } catch (err) {
      // Previously swallowed silently on the theory that a failure here
      // just meant "Firebase rate-limited a repeat send" — but that same
      // catch also hides a genuine send failure (e.g. the custom action
      // URL not yet being in Firebase's authorized-domains list), which
      // looks identical to "nothing happened" from here. Surface it.
      console.error("Resend verification failed:", err);
      setSendError(err?.code || err?.message || "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{
      background: `linear-gradient(135deg, #1a1a1a 0%, #111 100%)`,
      borderBottom: `2px solid ${brandColor}40`,
      borderLeft: `3px solid ${brandColor}`,
      px: { xs: 2, md: 3 },
      py: 1.25,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: "10px",
        bgcolor: `${brandColor}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <MarkEmailReadIcon sx={{ color: brandColor, fontSize: 20 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: { xs: "0.72rem", sm: "0.8rem" },
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.4,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <Box component="span" sx={{ color: brandColor, fontWeight: 600 }}>
            Verify your email.{" "}
          </Box>
          {sent ? "Sent — check your inbox." : `We emailed a link to ${user?.email || "your address"}.`}
        </Typography>
        {sendError && (
          <Typography sx={{ fontSize: "0.7rem", color: "#f87171", mt: 0.35, fontFamily: "'DM Sans', sans-serif" }}>
            {sendError}
          </Typography>
        )}
      </Box>

      {!sent && (
        <Button
          size="small"
          disabled={sending}
          onClick={handleResend}
          sx={{
            bgcolor: brandColor,
            color: "#111",
            fontWeight: 700,
            fontSize: "0.72rem",
            px: 1.5,
            py: 0.6,
            borderRadius: "8px",
            flexShrink: 0,
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: brandColor, opacity: 0.85 },
          }}
        >
          {sending ? "Sending…" : "Resend email"}
        </Button>
      )}

      <IconButton size="small" onClick={handleDismiss} sx={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, ml: 0.5 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
