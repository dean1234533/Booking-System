import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";

const STORAGE_KEY = "br_cookie_consent";
const G = { gold: "#C9A84C", dark: "#0d0d0d" };
const SANS = "'DM Sans', sans-serif";

// Real cookies are set on this site — Stripe.js (used for Payment Elements /
// Checkout, see src/stripe/stripeClient.js) sets its own fraud-prevention
// cookies as soon as it loads. This banner exists because of that, not just
// to satisfy a scanner check — see the Privacy Policy for details.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing etc.) — show the banner
      // every visit rather than crash; better to over-show than fail silently.
      setVisible(true);
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Box
      role="dialog"
      aria-label="Cookie consent"
      sx={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1400,
        bgcolor: G.dark, borderTop: "1px solid rgba(255,255,255,0.1)",
        px: { xs: 2, md: 4 }, py: 2,
        display: "flex", flexDirection: { xs: "column", sm: "row" },
        alignItems: "center", justifyContent: "center", gap: 2,
      }}
    >
      <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", textAlign: { xs: "center", sm: "left" }, maxWidth: 640 }}>
        We use essential cookies to keep you signed in and to process payments securely (via Stripe). See our{" "}
        <Typography component={Link} to="/privacy" sx={{ color: G.gold, textDecoration: "underline" }}>
          Privacy Policy
        </Typography>{" "}
        for details.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
        <Button
          onClick={accept}
          variant="contained"
          size="small"
          sx={{
            bgcolor: G.gold, color: G.dark, fontFamily: SANS, fontWeight: 700,
            fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase",
            borderRadius: "2px", boxShadow: "none",
            "&:hover": { bgcolor: "#e8c97a", boxShadow: "none" },
          }}
        >
          Accept
        </Button>
      </Stack>
    </Box>
  );
}
