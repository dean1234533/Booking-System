import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";

const STORAGE_KEY = "br_cookie_consent";
const G = { gold: "#2563EB", dark: "#0d0d0d" };
const SANS = "'DM Sans', sans-serif";

// Real cookies are set on this site — Stripe.js (used for Payment Elements /
// Checkout, see src/stripe/stripeClient.js) sets its own fraud-prevention
// cookies as soon as it loads. This banner exists because of that, not just
// to satisfy a scanner check — see the Privacy Policy for details.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing etc.) — show the banner
      // every visit rather than crash; better to over-show than fail silently.
      setVisible(true);
    }
  }, []);

  // At zIndex 1400 this sits above every other fixed element on every page
  // (the mobile dashboard nav at 1250, the WhatsApp FAB at 1300) — on a short
  // page, or one whose primary action sits near the bottom of the viewport
  // (e.g. /manage-booking, /cancel-booking), that means it can cover the
  // exact button someone's trying to tap before they've dismissed it. Rather
  // than guess a fixed height (the text wraps to 1 or 2 lines depending on
  // viewport width) or pad every page individually, reserve its ACTUAL
  // measured height in the document flow via a body padding, so nothing
  // underneath is ever hidden behind it, on any page, at any width.
  useLayoutEffect(() => {
    if (!visible) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const apply = () => { document.body.style.paddingBottom = `${el.offsetHeight}px`; document.documentElement.style.setProperty("--br-cookie-height", `${el.offsetHeight}px`); };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); document.body.style.paddingBottom = ""; document.documentElement.style.removeProperty("--br-cookie-height"); };
  }, [visible]);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Box
      ref={ref}
      role="dialog"
      aria-label="Cookie consent"
      sx={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1400,
        bgcolor: G.dark, borderTop: "1px solid rgba(255,255,255,0.1)",
        px: { xs: 2, md: 4 }, pt: 2, pb: "max(16px, env(safe-area-inset-bottom, 0px))",
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
            "&:hover": { bgcolor: "#60A5FA", boxShadow: "none" },
          }}
        >
          Accept
        </Button>
      </Stack>
    </Box>
  );
}
