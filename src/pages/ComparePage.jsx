import React from "react";
import { Box, Typography, Container, Stack, Grid, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RemoveIcon from "@mui/icons-material/Remove";

const GOLD   = "#C9A84C";
const DARK   = "#0d0d0d";
const DARK2  = "#111";
const DARK3  = "#1a1a1a";
const SERIF  = "'Playfair Display', serif";
const SANS   = "'DM Sans', sans-serif";

/* ── comparison data ───────────────────────────────────────── */
const COMPETITORS = [
  { name: "Bookrightly", highlight: true },
  { name: "Fresha" },
  { name: "Treatwell" },
  { name: "Bark.com" },
  { name: "Mindbody" },
];

const YES  = "yes";
const NO   = "no";
const PART = "partial";

const ROWS = [
  {
    label: "Multi-industry support",
    sub: "Barbers, salons, PTs, decorators",
    values: [YES, NO, NO, PART, PART],
  },
  {
    label: "Your own branded page",
    sub: "Not buried in a marketplace",
    values: [YES, NO, NO, NO, NO],
  },
  {
    label: "Flat monthly fee",
    sub: "Know exactly what you pay",
    values: [YES, NO, NO, NO, NO],
  },
  {
    label: "No commission per booking",
    sub: "Keep 100% of your service price",
    values: [YES, NO, NO, YES, YES],
  },
  {
    label: "90-day free trial",
    sub: "No credit card needed",
    values: [YES, YES, NO, NO, NO],
  },
  {
    label: "UK-built and UK-focused",
    sub: "Built for UK pricing, currency, regulations",
    values: [YES, YES, YES, YES, NO],
  },
  {
    label: "Installable PWA app",
    sub: "Customers install it like a native app",
    values: [YES, NO, NO, NO, NO],
  },
  {
    label: "Stripe payments built in",
    sub: "Deposits collected at booking",
    values: [YES, YES, NO, NO, YES],
  },
  {
    label: "Full client portal",
    sub: "Forms, check-ins, food diary, PAR-Q",
    values: [YES, NO, NO, NO, NO],
  },
  {
    label: "PT-specific features",
    sub: "Workout plans, progress tracking",
    values: [YES, NO, NO, NO, YES],
  },
  {
    label: "Decorator / trades booking",
    sub: "Quote forms, site visit scheduling",
    values: [YES, NO, NO, PART, NO],
  },
  {
    label: "Affordable for small businesses",
    sub: "From £10/month",
    values: [YES, PART, NO, NO, NO],
  },
];

const PRICING = [
  {
    name: "Bookrightly",
    price: "£10–20/month",
    model: "Flat subscription",
    highlight: true,
    notes: "90-day free trial. Small Stripe processing fee only when you earn.",
  },
  {
    name: "Fresha",
    price: "Free + commission",
    model: "Pay-now transaction fee",
    highlight: false,
    notes: "\"Free\" until customers pay online — then they charge a cut of every booking.",
  },
  {
    name: "Treatwell",
    price: "~30% commission",
    model: "Per-booking commission",
    highlight: false,
    notes: "For every £50 booking, Treatwell keeps ~£15. Costs grow as you do.",
  },
  {
    name: "Bark.com",
    price: "£5–50 per lead",
    model: "Pay-per-lead credits",
    highlight: false,
    notes: "Buy credits, spend them on leads that may not convert. Costs add up fast.",
  },
  {
    name: "Mindbody",
    price: "£100–400+/month",
    model: "Tiered subscription",
    highlight: false,
    notes: "US-designed, expensive, and far more complex than most UK small businesses need.",
  },
];

const USP_CARDS = [
  {
    icon: "🏷️",
    title: "Your brand, not theirs",
    body: "Fresha and Treatwell put your business inside their marketplace — customers book 'via Treatwell', not you. On Bookrightly, every business gets its own branded page at bookrightly.co.uk/your-name. Your identity, your reputation.",
  },
  {
    icon: "💸",
    title: "No commission on your earnings",
    body: "Treatwell takes up to 30% of every booking. Fresha charges a 'pay-now' transaction fee that sounds small but scales painfully. Bookrightly charges a flat £10–20/month — so a £500 week earns the same whether you have 5 bookings or 50.",
  },
  {
    icon: "🏭",
    title: "Built for more than beauty",
    body: "Fresha, Treatwell, and Booksy are built exclusively for salons and beauty. Bookrightly supports barbers, hairdressers, personal trainers, and decorators — all with industry-specific pages, features, and booking flows.",
  },
  {
    icon: "📱",
    title: "Installs like a real app",
    body: "Bookrightly is a Progressive Web App — customers can add it to their home screen and it works like a native mobile app. No App Store barriers. No £99/year Apple developer fee needed by the customer.",
  },
  {
    icon: "📋",
    title: "Full client management",
    body: "No other booking platform in this price range includes a client portal with PAR-Q health forms, food diary, check-ins, workout plans, and colour approval workflows. Built for professionals who need more than a calendar.",
  },
  {
    icon: "🇬🇧",
    title: "UK-first, always",
    body: "Mindbody is a US product retrofitted for the UK. Bookrightly was built in the UK, priced in GBP, designed around UK service businesses, and is maintained by a UK developer.",
  },
];

function Cell({ value, isFirst }) {
  if (isFirst) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 2 }}>
        <CheckCircleIcon sx={{ color: GOLD, fontSize: 22 }} />
      </Box>
    );
  }
  if (value === YES)   return <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CheckCircleIcon sx={{ color: "#4ade80", fontSize: 20 }} /></Box>;
  if (value === NO)    return <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CancelIcon sx={{ color: "rgba(255,255,255,0.15)", fontSize: 20 }} /></Box>;
  return <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><RemoveIcon sx={{ color: "rgba(255,255,255,0.25)", fontSize: 20 }} /></Box>;
}

export default function ComparePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>

      {/* ── Hero ── */}
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 10 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Chip label="Honest Comparison" sx={{ mb: 3, bgcolor: "rgba(201,168,76,0.1)", color: GOLD, fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.1em", border: `1px solid rgba(201,168,76,0.25)` }} />
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2.2rem", md: "3.4rem" }, fontWeight: 400, lineHeight: 1.2, mb: 2.5, maxWidth: 780, mx: "auto" }}>
          Why UK service businesses are switching to Bookrightly
        </Typography>
        <Typography sx={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.55)", maxWidth: 600, mx: "auto", lineHeight: 1.75, mb: 5 }}>
          Fresha, Treatwell, and Bark look free — until you do the maths. Bookrightly charges a flat fee, gives you a branded page, and keeps your clients yours.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Box
            component="button"
            onClick={() => navigate("/signup")}
            sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: "#0d0d0d", fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.04em", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}
          >
            Start free — 90 days
          </Box>
          <Box
            component="button"
            onClick={() => navigate("/")}
            sx={{ px: 4, py: 1.75, bgcolor: "transparent", color: "rgba(255,255,255,0.7)", fontFamily: SANS, fontWeight: 600, fontSize: "0.9rem", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", "&:hover": { borderColor: "rgba(255,255,255,0.35)" } }}
          >
            See how it works
          </Box>
        </Stack>
      </Box>

      {/* ── USP Cards ── */}
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, textAlign: "center", mb: 1.5 }}>
          What makes Bookrightly different
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "0.9rem", mb: 6 }}>
          Six things no other booking platform at this price point offers
        </Typography>
        <Grid container spacing={3}>
          {USP_CARDS.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5, height: "100%", "&:hover": { borderColor: "rgba(201,168,76,0.2)" }, transition: "border-color 0.2s" }}>
                <Typography sx={{ fontSize: "2rem", mb: 1.5 }}>{card.icon}</Typography>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "1rem", mb: 1.5, color: "#fff" }}>{card.title}</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.75 }}>{card.body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Feature comparison table ── */}
      <Box sx={{ bgcolor: DARK2, py: 10, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, textAlign: "center", mb: 1.5 }}>
            Feature-by-feature comparison
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "0.9rem", mb: 6 }}>
            Bookrightly vs Fresha, Treatwell, Bark.com, and Mindbody
          </Typography>

          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 640 }}>
              {/* Header row */}
              <Box sx={{ display: "grid", gridTemplateColumns: "2fr repeat(5, 1fr)", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", pb: 2, mb: 1 }}>
                <Box />
                {COMPETITORS.map((c) => (
                  <Box key={c.name} sx={{ textAlign: "center", px: 1 }}>
                    <Typography sx={{
                      fontFamily: SANS, fontWeight: 800, fontSize: "0.75rem",
                      color: c.highlight ? GOLD : "rgba(255,255,255,0.4)",
                      letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>
                      {c.name}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Data rows */}
              {ROWS.map((row, i) => (
                <Box
                  key={row.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr repeat(5, 1fr)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    bgcolor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    "&:hover": { bgcolor: "rgba(201,168,76,0.04)" },
                    transition: "background 0.15s",
                  }}
                >
                  <Box sx={{ py: 2, px: 1 }}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>{row.label}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", mt: 0.25 }}>{row.sub}</Typography>
                  </Box>
                  {row.values.map((v, ci) => (
                    <Cell key={ci} value={v} isFirst={ci === 0 && v === YES} />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── Pricing comparison ── */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, textAlign: "center", mb: 1.5 }}>
          The real cost of each platform
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "0.9rem", mb: 6 }}>
          "Free" platforms are never free — they just hide the fee inside your earnings
        </Typography>
        <Grid container spacing={2.5}>
          {PRICING.map((p) => (
            <Grid item xs={12} sm={6} md={p.highlight ? 12 / 1 : 12 / 2} key={p.name}>
              <Box sx={{
                bgcolor: p.highlight ? "rgba(201,168,76,0.07)" : DARK3,
                border: `1px solid ${p.highlight ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`,
                p: 3, height: "100%",
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: "0.95rem", color: p.highlight ? GOLD : "#fff" }}>
                    {p.name}
                  </Typography>
                  {p.highlight && <Chip label="Best value" size="small" sx={{ bgcolor: GOLD, color: "#0d0d0d", fontWeight: 800, fontSize: "0.6rem" }} />}
                </Stack>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.6rem", fontWeight: 400, color: p.highlight ? GOLD : "rgba(255,255,255,0.7)", mb: 0.5 }}>
                  {p.price}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>
                  {p.model}
                </Typography>
                <Typography sx={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  {p.notes}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Industries ── */}
      <Box sx={{ bgcolor: DARK2, py: 10, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, mb: 2 }}>
            The only platform that covers all four industries
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", mb: 6, lineHeight: 1.8 }}>
            Fresha and Treatwell are beauty-only. Mindbody is fitness-only. Bark is a lead generator, not a booking platform. Bookrightly is the only UK platform built for barbers, hairdressers, personal trainers, and decorators — all under one roof.
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {[
              ["💇", "Barbers", "Real-time slots, hot towel shave, service menu, deposit booking"],
              ["💅", "Hairdressers", "Treatment pages, colour consultations, before/after portfolio"],
              ["🏋️", "Personal Trainers", "PAR-Q forms, workout plans, client portal, food diary, check-ins"],
              ["🎨", "Decorators", "Quote request forms, site visit scheduling, colour approval flow"],
            ].map(([icon, label, desc]) => (
              <Grid item xs={12} sm={6} key={label}>
                <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3, textAlign: "left" }}>
                  <Typography sx={{ fontSize: "1.8rem", mb: 1 }}>{icon}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 0.75, color: GOLD }}>{label}</Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Final CTA ── */}
      <Box sx={{ py: { xs: 10, md: 14 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(201,168,76,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.8rem", md: "2.8rem" }, fontWeight: 400, mb: 2, maxWidth: 640, mx: "auto" }}>
          90 days free. No credit card. No commission.
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", mb: 5, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
          Join UK service professionals already using Bookrightly to take bookings, manage clients, and grow their business — without losing a cut to a marketplace.
        </Typography>
        <Box
          component="button"
          onClick={() => navigate("/signup")}
          sx={{ px: 5, py: 2, bgcolor: GOLD, color: "#0d0d0d", fontFamily: SANS, fontWeight: 800, fontSize: "1rem", letterSpacing: "0.05em", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}
        >
          Get started free
        </Box>
      </Box>

    </Box>
  );
}
