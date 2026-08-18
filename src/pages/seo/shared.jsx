import React from "react";
import { Box, Typography, Stack, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const GOLD  = "#2563EB";
export const DARK  = "#F5F3ED";
export const DARK2 = "#EAF2FF";
export const DARK3 = "#111116";
export const SERIF = "'DM Sans', sans-serif";
export const SANS  = "'DM Sans', sans-serif";

export function SEOHero({ eyebrow, title, subtitle, cta = "Start free — 90 days", sx = {} }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ pt: { xs: 12, md: 16 }, pb: { xs: 7, md: 9 }, px: { xs: 2, md: 5 }, position: "relative", overflow: "hidden", bgcolor: DARK, ...sx }}>
      <Box sx={{ maxWidth: 1180, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr .85fr" }, gap: { xs: 4, md: 8 }, alignItems: "end" }}>
        <Box>
          {eyebrow && <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: GOLD, mb: 2 }}>{eyebrow}</Typography>}
          <Typography sx={{ fontFamily: SERIF, color: "#111116", fontSize: { xs: "2.8rem", md: "5.6rem" }, fontWeight: 950, letterSpacing: "-.075em", lineHeight: .9 }}>{title}</Typography>
        </Box>
        <Box sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: "1rem", color: "#696A73", maxWidth: 540, lineHeight: 1.75, mb: 3 }}>{subtitle}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <CTAButton onClick={() => navigate("/signup")}>{cta}</CTAButton>
            <GhostButton onClick={() => navigate("/compare")}>Compare tools</GhostButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export function CTAButton({ children, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: "#fff", fontFamily: SANS, fontWeight: 900, fontSize: "0.9rem", borderRadius: 99, border: "none", cursor: "pointer", boxShadow: "0 12px 30px rgba(37,99,235,.22)", "&:hover": { bgcolor: "#1D4ED8" } }}>
      {children}
    </Box>
  );
}

export function GhostButton({ children, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{ px: 4, py: 1.75, bgcolor: "#fff", color: "#111116", fontFamily: SANS, fontWeight: 850, fontSize: "0.9rem", borderRadius: 99, border: "1px solid #DEDDD8", cursor: "pointer", "&:hover": { borderColor: GOLD } }}>
      {children}
    </Box>
  );
}

export function Section({ children, dark, sx = {} }) {
  return (
    <Box sx={{ bgcolor: dark ? DARK2 : DARK, color: "#111116", py: { xs: 8, md: 11 }, px: { xs: 3, md: 5 }, ...sx }}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>{children}</Box>
    </Box>
  );
}

export function SectionHead({ eyebrow, title, sub }) {
  return (
    <Box sx={{ textAlign: "left", mb: 6, display: { md: "grid" }, gridTemplateColumns: { md: sub ? "1fr .7fr" : "1fr" }, gap: 4, alignItems: "end" }}>
      <Box>
      {eyebrow && <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 1.5 }}>{eyebrow}</Typography>}
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2.2rem", md: "3.6rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>{title}</Typography>
      </Box>
      {sub && <Typography sx={{ color: "#696A73", fontSize: "0.9rem", maxWidth: 590, lineHeight: 1.8 }}>{sub}</Typography>}
    </Box>
  );
}

export function FeatureCard({ icon, title, body }) {
  return (
    <Box sx={{ bgcolor: "#fff", border: "1px solid #DEDDD8", borderRadius: "7px 30px 30px 30px", p: 3.5, minHeight: 240, height: "100%", display: "flex", flexDirection: "column", boxShadow: "none", "&:hover": { bgcolor: "#111116", color: "#fff", transform: "translateY(-4px) rotate(-.3deg)", "& p": { color: "inherit" } }, transition: "all 0.25s" }}>
      {icon && <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "#EAF2FF", display: "grid", placeItems: "center" }}><Typography sx={{ fontSize: "1.45rem" }}>{icon}</Typography></Box>}
      <Typography sx={{ fontFamily: SANS, fontWeight: 900, fontSize: "1rem", mt: "auto", mb: 1.5, color: "#111116" }}>{title}</Typography>
      <Typography sx={{ color: "#696A73", fontSize: "0.84rem", lineHeight: 1.75 }}>{body}</Typography>
    </Box>
  );
}

export function StepCard({ number, title, body }) {
  return (
    <Box sx={{ bgcolor: "#111116", color: "#fff", borderRadius: "28px 7px 28px 28px", p: 3.5, minHeight: 235, position: "relative", display: "flex", flexDirection: "column" }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: "4.8rem", color: "#93C5FD", lineHeight: .8, fontWeight: 950 }}>{number}</Typography>
      <Typography sx={{ fontFamily: SANS, fontWeight: 900, fontSize: "0.95rem", mt: "auto", mb: 1, color: "#fff" }}>{title}</Typography>
      <Typography sx={{ color: "#ffffff88", fontSize: "0.84rem", lineHeight: 1.75 }}>{body}</Typography>
    </Box>
  );
}

export function BottomCTA({ title, sub }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ py: { xs: 10, md: 14 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative", overflow: "hidden", bgcolor: "#111116", color: "#fff" }}>
      <Box sx={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", bgcolor: "rgba(37,99,235,.15)", right: -250, top: -300, pointerEvents: "none" }} />
      <Typography sx={{ position: "relative", fontFamily: SERIF, fontSize: { xs: "2rem", md: "3.2rem" }, fontWeight: 950, letterSpacing: "-.06em", mb: 2, maxWidth: 700, mx: "auto" }}>{title}</Typography>
      <Typography sx={{ position: "relative", color: "rgba(255,255,255,.5)", fontSize: "0.95rem", mb: 5, maxWidth: 500, mx: "auto", lineHeight: 1.8 }}>{sub}</Typography>
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
    <Box sx={{ borderTop: "1px solid #DEDDD8", pt: 5, mt: 2 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8A91", mb: 2.5 }}>
        Explore Bookrightly
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {links.map((l) => (
          <Box
            key={l.path}
            component="span"
            onClick={() => navigate(l.path)}
            sx={{ fontSize: "0.8rem", color: "#696A73", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, "&:hover": { color: GOLD } }}
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
        <Box key={i} sx={{ borderBottom: "1px solid #DEDDD8" }}>
          <Box onClick={() => setOpen(open === i ? null : i)} sx={{ py: 2.5, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontFamily: SANS, fontWeight: 850, fontSize: "0.92rem", color: "#111116" }}>{faq.q}</Typography>
            <Typography sx={{ color: GOLD, fontSize: "1.2rem", flexShrink: 0 }}>{open === i ? "−" : "+"}</Typography>
          </Box>
          {open === i && <Typography sx={{ color: "#696A73", fontSize: "0.85rem", lineHeight: 1.8, pb: 2.5 }}>{faq.a}</Typography>}
        </Box>
      ))}
    </Box>
  );
}
