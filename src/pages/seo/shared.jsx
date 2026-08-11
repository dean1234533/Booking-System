import React from "react";
import { Box, Typography, Stack, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const GOLD  = "#C9A84C";
export const DARK  = "#0d0d0d";
export const DARK2 = "#111";
export const DARK3 = "#1a1a1a";
export const SERIF = "'Playfair Display', serif";
export const SANS  = "'DM Sans', sans-serif";

export function SEOHero({ eyebrow, title, subtitle, cta = "Start free — 90 days" }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 10 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />
      {eyebrow && <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>{eyebrow}</Typography>}
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3.2rem" }, fontWeight: 400, lineHeight: 1.2, mb: 2.5, maxWidth: 820, mx: "auto" }}>{title}</Typography>
      <Typography sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", maxWidth: 580, mx: "auto", lineHeight: 1.8, mb: 5 }}>{subtitle}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
        <CTAButton onClick={() => navigate("/signup")}>{cta}</CTAButton>
        <GhostButton onClick={() => navigate("/compare")}>See full comparison</GhostButton>
      </Stack>
    </Box>
  );
}

export function CTAButton({ children, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.04em", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
      {children}
    </Box>
  );
}

export function GhostButton({ children, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{ px: 4, py: 1.75, bgcolor: "transparent", color: "rgba(255,255,255,0.65)", fontFamily: SANS, fontWeight: 600, fontSize: "0.9rem", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", "&:hover": { borderColor: "rgba(255,255,255,0.35)" } }}>
      {children}
    </Box>
  );
}

export function Section({ children, dark, sx = {} }) {
  return (
    <Box sx={{ bgcolor: dark ? DARK2 : DARK, py: { xs: 8, md: 10 }, px: { xs: 3, md: 5 }, ...sx }}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>{children}</Box>
    </Box>
  );
}

export function SectionHead({ eyebrow, title, sub }) {
  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      {eyebrow && <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 1.5 }}>{eyebrow}</Typography>}
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, mb: sub ? 1.5 : 0 }}>{title}</Typography>
      {sub && <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", maxWidth: 560, mx: "auto", lineHeight: 1.8 }}>{sub}</Typography>}
    </Box>
  );
}

export function FeatureCard({ icon, title, body }) {
  return (
    <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5, height: "100%", "&:hover": { borderColor: "rgba(201,168,76,0.2)" }, transition: "border-color 0.2s" }}>
      {icon && <Typography sx={{ fontSize: "1.8rem", mb: 1.5 }}>{icon}</Typography>}
      <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem", mb: 1.5, color: "#fff" }}>{title}</Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.84rem", lineHeight: 1.75 }}>{body}</Typography>
    </Box>
  );
}

export function StepCard({ number, title, body }) {
  return (
    <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5, position: "relative" }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: "3rem", color: "rgba(201,168,76,0.15)", lineHeight: 1, mb: 1 }}>{number}</Typography>
      <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem", mb: 1, color: "#fff" }}>{title}</Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.84rem", lineHeight: 1.75 }}>{body}</Typography>
    </Box>
  );
}

export function BottomCTA({ title, sub }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ py: { xs: 10, md: 14 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(201,168,76,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.8rem", md: "2.8rem" }, fontWeight: 400, mb: 2, maxWidth: 640, mx: "auto" }}>{title}</Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", mb: 5, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>{sub}</Typography>
      <CTAButton onClick={() => navigate("/signup")}>Get started free</CTAButton>
      <Typography sx={{ mt: 3, fontSize: "0.78rem", color: "rgba(255,255,255,0.25)" }}>
        Don't see your industry?{" "}
        <Box component="span" onClick={() => navigate("/#request")} sx={{ color: GOLD, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Request it — we'll build it out.
        </Box>
      </Typography>
    </Box>
  );
}

export function InternalLinks({ current }) {
  const navigate = useNavigate();
  const links = [
    { label: "Barber booking software", path: "/booking-software/barbers" },
    { label: "Salon booking software", path: "/booking-software/salons" },
    { label: "PT booking software", path: "/booking-software/personal-trainers" },
    { label: "Decorator software", path: "/booking-software/decorators" },
    { label: "Fresha alternative", path: "/fresha-alternative" },
    { label: "Treatwell alternative", path: "/treatwell-alternative" },
    { label: "Pricing", path: "/pricing" },
    { label: "How it works", path: "/how-it-works" },
    { label: "Compare platforms", path: "/compare" },
    { label: "No-show calculator", path: "/tools/no-show-calculator" },
    { label: "Blog", path: "/blog" },
  ].filter((l) => l.path !== current);

  return (
    <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.05)", pt: 5, mt: 2 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", mb: 2.5 }}>
        Explore Bookrightly
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {links.map((l) => (
          <Box
            key={l.path}
            component="span"
            onClick={() => navigate(l.path)}
            sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, "&:hover": { color: GOLD } }}
          >
            {l.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function FAQSection({ faqs }) {
  const [open, setOpen] = React.useState(null);
  return (
    <Box>
      {faqs.map((faq, i) => (
        <Box key={i} sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Box onClick={() => setOpen(open === i ? null : i)} sx={{ py: 2.5, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.92rem", color: "rgba(255,255,255,0.85)" }}>{faq.q}</Typography>
            <Typography sx={{ color: GOLD, fontSize: "1.2rem", flexShrink: 0 }}>{open === i ? "−" : "+"}</Typography>
          </Box>
          {open === i && <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.8, pb: 2.5 }}>{faq.a}</Typography>}
        </Box>
      ))}
    </Box>
  );
}
