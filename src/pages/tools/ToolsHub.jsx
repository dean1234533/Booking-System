import React from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

const GOLD = "#C9A84C";
const DARK = "#0d0d0d";
const DARK2 = "#111";
const DARK3 = "#1a1a1a";
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

const TOOLS = [
  {
    title: "No-Show Cost Calculator",
    desc: "See exactly how much no-shows are costing your business per year — and how much a deposit system would recover.",
    path: "/tools/no-show-calculator",
    tag: "Barbers · Salons · PTs",
    icon: "📉",
  },
  {
    title: "Revenue Calculator",
    desc: "Calculate your monthly and yearly revenue potential based on clients per day, service price, and working days.",
    path: "/tools/revenue-calculator",
    tag: "Barbers · Hairdressers",
    icon: "💷",
  },
  {
    title: "PT Session Rate Calculator",
    desc: "Work out exactly what to charge per session to hit your income target after overheads, holidays, and slow weeks.",
    path: "/tools/pt-rate-calculator",
    tag: "Personal Trainers",
    icon: "🏋️",
  },
  {
    title: "Service Pricing Calculator",
    desc: "Price any service correctly — factoring in materials, overheads, time, and your target profit margin.",
    path: "/tools/service-pricing-calculator",
    tag: "All industries",
    icon: "🧮",
  },
];

export default function ToolsHub() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      {/* Hero */}
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Free Tools
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          Free calculators for UK service professionals
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          Built for barbers, hairdressers, personal trainers, and decorators. No sign-up required.
        </Typography>
      </Box>

      {/* Tools grid */}
      <Box sx={{ py: { xs: 4, md: 6 }, px: { xs: 3, md: 5 } }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Grid container spacing={3}>
            {TOOLS.map((tool) => (
              <Grid item xs={12} sm={6} key={tool.path}>
                <Box
                  onClick={() => navigate(tool.path)}
                  sx={{
                    bgcolor: DARK2,
                    border: "1px solid rgba(255,255,255,0.06)",
                    p: 4,
                    cursor: "pointer",
                    height: "100%",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: "rgba(201,168,76,0.35)" },
                  }}
                >
                  <Typography sx={{ fontSize: "2rem", mb: 2 }}>{tool.icon}</Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.15rem", mb: 1.5, color: "#fff" }}>
                    {tool.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8, mb: 2 }}>
                    {tool.desc}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.72rem", color: GOLD, fontWeight: 600, letterSpacing: "0.05em" }}>
                      {tool.tag}
                    </Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>
                      Use free →
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Fazier badge */}
          <Box sx={{ mt: 6, textAlign: "center" }}>
            <a href="https://fazier.com" target="_blank" rel="noopener noreferrer">
              <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=dark" width={120} alt="Fazier badge" />
            </a>
          </Box>

          {/* CTA */}
          <Box sx={{ mt: 6, bgcolor: DARK3, border: "1px solid rgba(201,168,76,0.2)", p: { xs: 4, md: 6 }, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "2rem" }, mb: 1.5 }}>
              Ready to take bookings online?
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
              Bookrightly gives you a booking page, deposit collection, automated reminders, and a client dashboard — for £10/month. 90-day free trial.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 5, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Start free trial
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
