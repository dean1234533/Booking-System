import React, { useEffect } from "react";
import { Box, Container, Typography, Button, Stack } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { useNavigate } from "react-router-dom";

// ── Brand tokens (match Home/LegalPage) ─────────────────────────────────────
const G = {
  gold:      "#C9A84C",
  dark:      "#0d0d0d",
  dark2:     "#1a1a1a",
  warmWhite: "#faf8f4",
};
const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const SUPPORT_EMAIL = "support@bookrightly.com";

export default function ContactPage() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <Box sx={{ bgcolor: G.warmWhite, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header band — matches LegalPage */}
      <Box sx={{ bgcolor: G.dark, px: { xs: 2, md: 5 }, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md" disableGutters>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none", mb: 2, "&:hover": { color: G.gold, bgcolor: "transparent" } }}
          >
            Back to Bookrightly
          </Button>
          <Typography sx={{ fontFamily: SERIF, color: "#fff", fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 400, lineHeight: 1.1 }}>
            Contact us
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", mt: 1.5, letterSpacing: "0.04em" }}>
            We're a small team — a real person reads every message.
          </Typography>
        </Container>
      </Box>

      {/* Body */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        <Typography sx={{ color: "#3a3530", fontSize: "0.95rem", lineHeight: 1.85, mb: 4 }}>
          Bookrightly is an online-only platform used by service professionals across the UK, so we don't
          run a phone line or a single physical office — email is the quickest way to reach us, and we
          aim to reply within one working day.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
          <EmailOutlinedIcon sx={{ color: G.gold }} />
          <Typography
            component="a"
            href={`mailto:${SUPPORT_EMAIL}`}
            sx={{ fontFamily: SERIF, color: G.dark2, fontSize: "1.15rem", textDecoration: "none", "&:hover": { color: G.gold } }}
          >
            {SUPPORT_EMAIL}
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: SERIF, color: G.dark2, fontSize: "1.1rem", fontWeight: 600, mb: 1.5 }}>
            Already have an account?
          </Typography>
          <Typography sx={{ color: "#4a443d", fontSize: "0.92rem", lineHeight: 1.85, mb: 2 }}>
            You can also send us a message directly from the homepage feedback form, or from your dashboard
            once you're logged in.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              onClick={() => navigate("/#feedback-section")}
              sx={{ borderColor: G.gold, color: G.dark2, textTransform: "none", "&:hover": { borderColor: G.gold, bgcolor: "rgba(201,168,76,0.06)" } }}
            >
              Homepage feedback form
            </Button>
            <Button
              variant="text"
              onClick={() => navigate("/login")}
              sx={{ color: G.dark2, textTransform: "none" }}
            >
              Log in
            </Button>
          </Stack>
        </Box>

        <Box sx={{ borderTop: "1px solid #e8e2d8", pt: 3, mt: 2 }}>
          <Typography sx={{ color: "#9a8f7e", fontSize: "0.78rem", lineHeight: 1.7 }}>
            For privacy-specific requests, see our{" "}
            <Typography component="a" href="/privacy" sx={{ color: "#9a8f7e", textDecoration: "underline" }}>
              Privacy Policy
            </Typography>
            . For account or billing terms, see our{" "}
            <Typography component="a" href="/terms" sx={{ color: "#9a8f7e", textDecoration: "underline" }}>
              Terms &amp; Conditions
            </Typography>
            .
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
