import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Grid, Paper, Skeleton,
  Button, Stack, Chip, InputBase, Select, MenuItem,
  useMediaQuery, useTheme,
} from "@mui/material";
import SearchIcon       from "@mui/icons-material/Search";
import LocationOnIcon   from "@mui/icons-material/LocationOn";
import StarIcon         from "@mui/icons-material/Star";
import ContentCutIcon   from "@mui/icons-material/ContentCut";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import PlumbingIcon     from "@mui/icons-material/Plumbing";
import BrushIcon        from "@mui/icons-material/Brush";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import YardIcon         from "@mui/icons-material/Yard";
import BuildIcon        from "@mui/icons-material/Build";
import SpaIcon          from "@mui/icons-material/Spa";
import VerifiedIcon     from "@mui/icons-material/Verified";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CategoryRow      from "../components/CategoryRow";
import TenantHome       from "./TenantHome";
import { useBarbers }   from "../hooks/useBarbers";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const T = {
  teal:        "#0F6E56",
  tealMid:     "#1D9E75",
  tealLight:   "#E1F5EE",
  tealPale:    "#f0faf6",
  amber:       "#BA7517",
  amberLight:  "#FAEEDA",
  coral:       "#D85A30",
  coralLight:  "#FAECE7",
  slate:       "#1e2a32",
  slateMid:    "#374955",
  muted:       "#64748b",
  border:      "#e8edf0",
  bg:          "#f8fafa",
};

const FONT_SERIF = "'Fraunces', serif";
const FONT_SANS  = "'Plus Jakarta Sans', sans-serif";

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All",              icon: <BuildIcon />,              color: T.teal,       bg: T.tealLight  },
  { label: "Barbers",          icon: <ContentCutIcon />,         color: T.teal,       bg: T.tealLight  },
  { label: "Electricians",     icon: <ElectricalServicesIcon />, color: T.amber,      bg: T.amberLight },
  { label: "Plumbers",         icon: <PlumbingIcon />,           color: "#185FA5",    bg: "#e8f4fd"    },
  { label: "Decorators",       icon: <BrushIcon />,              color: T.coral,      bg: T.coralLight },
  { label: "Personal Trainers",icon: <FitnessCenterIcon />,      color: "#534AB7",    bg: "#EEEDFE"    },
  { label: "Gardeners",        icon: <YardIcon />,               color: "#3B6D11",    bg: "#EAF3DE"    },
  { label: "Beauty",           icon: <SpaIcon />,                color: "#993556",    bg: "#FBEAF0"    },
];

const REVIEWS = [
  { name: "Marcus J.", initials: "MJ", text: "Found my go-to barber in minutes. The booking was seamless and he was exactly as advertised — proper quality.", trade: "Barber", color: T.teal, bg: T.tealLight },
  { name: "Elena R.",  initials: "ER", text: "Got a decorator sorted within a day. The reviews on here are genuine — no dodgy contractors, just verified pros.", trade: "Decorator", color: T.coral, bg: T.coralLight },
  { name: "Jordan T.", initials: "JT", text: "My PT is brilliant and I booked him entirely through TradeHub. Honestly the easiest experience I've had finding a trainer.", trade: "Personal Trainer", color: "#534AB7", bg: "#EEEDFE" },
];

const HOW_STEPS = [
  { num: "1", title: "Search & browse",    body: "Filter by trade, location, and rating to find exactly who you need." },
  { num: "2", title: "Compare & choose",   body: "Read reviews, check availability, and pick the best fit for your job." },
  { num: "3", title: "Book instantly",     body: "Confirm your slot in seconds. No phone calls, no waiting around." },
];

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = "md" }) {
  const fs = size === "lg" ? "1.6rem" : "1.2rem";
  const iconSz = size === "lg" ? 36 : 28;
  return (
    <Stack direction="row" alignItems="center" spacing={1.2}>
      <Box sx={{
        width: iconSz, height: iconSz, bgcolor: T.teal, borderRadius: "8px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <BuildIcon sx={{ color: "#fff", fontSize: iconSz * 0.55 }} />
      </Box>
      <Typography sx={{ fontFamily: FONT_SERIF, fontSize: fs, fontWeight: 600, color: T.slate, lineHeight: 1 }}>
        Trade<span style={{ color: T.tealMid }}>Hub</span>
      </Typography>
    </Stack>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ label, title, center = false }) {
  return (
    <Box sx={{ textAlign: center ? "center" : "left" }}>
      <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.tealMid, mb: 0.8 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: FONT_SERIF, fontSize: { xs: "1.5rem", md: "1.9rem" }, fontWeight: 600, color: T.slate, lineHeight: 1.2 }}>
        {title}
      </Typography>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Home({ tenant }) {
  const { barbers, loading } = useBarbers(!tenant);
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);
  if (tenant) return <TenantHome tenant={tenant} />;

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: FONT_SANS }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: `1px solid ${T.border}`, px: { xs: 2, md: 5 }, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Logo />
        <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
          {["Browse", "How it works", "For businesses"].map(l => (
            <Typography key={l} sx={{ fontFamily: FONT_SANS, fontSize: "0.85rem", fontWeight: 500, color: T.muted, cursor: "pointer", "&:hover": { color: T.teal }, transition: "color .2s" }}>
              {l}
            </Typography>
          ))}
          <Button variant="contained" sx={{ bgcolor: T.teal, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.8rem", borderRadius: "8px", px: 2.5, py: 1, boxShadow: "none", "&:hover": { bgcolor: T.tealMid, boxShadow: "none" } }}>
            Post a job
          </Button>
        </Stack>
      </Box>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.slate, pt: { xs: 8, md: 11 }, pb: 0, position: "relative", overflow: "hidden" }}>
        {/* Top accent strip */}
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, bgcolor: T.tealMid }} />

        {/* Large background text */}
        <Typography sx={{
          position: "absolute", right: -20, top: 16,
          fontFamily: FONT_SERIF, fontSize: { xs: "10rem", md: "16rem" }, fontWeight: 600,
          color: "rgba(255,255,255,0.025)", lineHeight: 1, pointerEvents: "none", userSelect: "none",
        }}>
          Trades
        </Typography>

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          {/* Badge */}
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 1,
            bgcolor: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: "99px", px: 2, py: 0.7, mb: 3.5,
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: T.tealMid }} />
            <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", fontWeight: 500, color: "#5DCAA5", letterSpacing: "0.04em" }}>
              The UK's trusted trades marketplace
            </Typography>
          </Box>

          {/* Title */}
          <Typography sx={{
            fontFamily: FONT_SERIF, fontWeight: 600, color: "#fff",
            fontSize: { xs: "2.8rem", md: "4rem", lg: "4.8rem" },
            lineHeight: 1.08, letterSpacing: "-0.02em", mb: 2.5,
          }}>
            Find the right pro<br />for <em style={{ fontStyle: "italic", color: "#5DCAA5" }}>any</em> job
          </Typography>

          {/* Subtitle */}
          <Typography sx={{
            fontFamily: FONT_SANS, fontSize: { xs: "0.95rem", md: "1.05rem" }, fontWeight: 400,
            color: "rgba(255,255,255,0.6)", lineHeight: 1.8, maxWidth: 540, mb: 5,
          }}>
            From barbers and builders to personal trainers and electricians — browse, compare, and book vetted local professionals in minutes.
          </Typography>

          {/* CTAs */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={7}>
            <Button
              startIcon={<SearchIcon />}
              variant="contained"
              sx={{ bgcolor: T.tealMid, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.85rem", px: 3.5, py: 1.6, borderRadius: "10px", boxShadow: "none", "&:hover": { bgcolor: "#5DCAA5", boxShadow: "none" }, transition: "background .2s" }}
            >
              Find a professional
            </Button>
            <Button
              variant="outlined"
              sx={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff", fontFamily: FONT_SANS, fontWeight: 500, fontSize: "0.85rem", px: 3.5, py: 1.6, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.06)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)" } }}
            >
              List your business
            </Button>
          </Stack>

          {/* Stats */}
          <Stack direction="row" sx={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            {[
              { num: "2,400+", label: "Verified professionals" },
              { num: "18+",    label: "Trade categories" },
              { num: "4.9★",   label: "Average rating" },
            ].map((s, i) => (
              <Box key={i} sx={{ py: 2.5, pr: 4, mr: 4, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "1.8rem", fontWeight: 600, color: "#fff", lineHeight: 1 }}>
                  {s.num.replace(/\d.*/g, m => <span style={{ color: T.tealMid }}>{m}</span>)}
                  {s.num}
                </Typography>
                <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", mt: 0.5, letterSpacing: "0.03em" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── SEARCH BAR ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: `1px solid ${T.border}`, px: { xs: 2, md: 5 }, py: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1.5, border: `1.5px solid ${T.border}`, borderRadius: "10px", px: 2, height: 46, "&:focus-within": { borderColor: T.tealMid } }}>
            <SearchIcon sx={{ color: T.muted, fontSize: 18 }} />
            <InputBase placeholder='What service do you need? e.g. "barber", "plumber"' sx={{ flex: 1, fontFamily: FONT_SANS, fontSize: "0.875rem" }} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, border: `1.5px solid ${T.border}`, borderRadius: "10px", px: 2, height: 46, minWidth: 160 }}>
            <LocationOnIcon sx={{ color: T.muted, fontSize: 18 }} />
            <InputBase placeholder="Location" sx={{ flex: 1, fontFamily: FONT_SANS, fontSize: "0.875rem" }} />
          </Box>
          <Button variant="contained" startIcon={<SearchIcon />} sx={{ height: 46, px: 3.5, bgcolor: T.teal, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.82rem", borderRadius: "10px", boxShadow: "none", whiteSpace: "nowrap", "&:hover": { bgcolor: T.tealMid, boxShadow: "none" } }}>
            Search
          </Button>
        </Stack>
      </Box>

      {/* ── CATEGORY PILLS ───────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: `1px solid ${T.border}`, px: { xs: 2, md: 5 }, py: 1.5, overflowX: "auto", display: "flex", gap: 1 }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.label}
            icon={React.cloneElement(cat.icon, { style: { fontSize: 15, color: activeCategory === cat.label ? cat.color : T.muted } })}
            label={cat.label}
            onClick={() => setActiveCategory(cat.label)}
            sx={{
              fontFamily: FONT_SANS, fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
              bgcolor:      activeCategory === cat.label ? cat.bg   : "#fff",
              color:        activeCategory === cat.label ? cat.color : T.muted,
              borderColor:  activeCategory === cat.label ? cat.color : T.border,
              border:       "1.5px solid",
              borderRadius: "99px",
              transition: "all .2s",
              "&:hover": { bgcolor: cat.bg, color: cat.color, borderColor: cat.color },
              "& .MuiChip-icon": { ml: 1 },
            }}
          />
        ))}
      </Box>

      {/* ── LISTINGS ─────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.bg, py: { xs: 6, md: 10 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg" disableGutters>
          {loading ? (
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
          ) : (
            <>
              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
                  <SectionHeading label="Grooming" title="Top-rated barbers near you" />
                  <Button endIcon={<ArrowForwardIcon />} sx={{ color: T.teal, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.8rem" }}>See all</Button>
                </Box>
                <CategoryRow title="Barbers" businessType="barber" allBusinesses={barbers} />
              </Box>

              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
                  <SectionHeading label="Home Trades" title="Trusted tradespeople near you" />
                  <Button endIcon={<ArrowForwardIcon />} sx={{ color: T.teal, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.8rem" }}>See all</Button>
                </Box>
                <CategoryRow title="Decorators" businessType="decorator" allBusinesses={barbers} />
              </Box>

              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
                  <SectionHeading label="Health & Fitness" title="Personal trainers in your area" />
                  <Button endIcon={<ArrowForwardIcon />} sx={{ color: T.teal, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.8rem" }}>See all</Button>
                </Box>
                <CategoryRow title="Trainers" businessType="trainer" allBusinesses={barbers} />
              </Box>
            </>
          )}
        </Container>
      </Box>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.teal, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 }, textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", mb: 1.5 }}>
            Simple process
          </Typography>
          <Typography sx={{ fontFamily: FONT_SERIF, fontSize: { xs: "1.8rem", md: "2.4rem" }, fontWeight: 600, color: "#fff", mb: 7 }}>
            Book in three steps
          </Typography>
          <Grid container spacing={4}>
            {HOW_STEPS.map(step => (
              <Grid item xs={12} md={4} key={step.num}>
                <Box sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                  <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "1.3rem", fontWeight: 600, color: "#fff" }}>{step.num}</Typography>
                </Box>
                <Typography sx={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.9rem", color: "#fff", mb: 1 }}>{step.title}</Typography>
                <Typography sx={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: "0.83rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{step.body}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 5 }}>
            <SectionHeading label="Testimonials" title="Trusted by thousands" />
          </Box>
          <Grid container spacing={3}>
            {REVIEWS.map((rev, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper elevation={0} sx={{ p: 3.5, bgcolor: T.bg, border: `1px solid ${T.border}`, borderRadius: 3, height: "100%" }}>
                  <Stack direction="row" spacing={0.4} mb={2}>
                    {[1,2,3,4,5].map(j => <StarIcon key={j} sx={{ color: T.amber, fontSize: 15 }} />)}
                  </Stack>
                  <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.875rem", fontStyle: "italic", color: T.slateMid, lineHeight: 1.75, mb: 2.5 }}>
                    "{rev.text}"
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: rev.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", fontWeight: 700, color: rev.color }}>{rev.initials}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.82rem", color: T.slate }}>{rev.name}</Typography>
                      <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", color: T.muted }}>Booked: {rev.trade}</Typography>
                    </Box>
                    <VerifiedIcon sx={{ color: T.tealMid, fontSize: 16, ml: "auto" }} />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.slate, py: { xs: 10, md: 14 }, px: { xs: 2, md: 5 }, textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mb: 1.5 }}>
            Join the platform
          </Typography>
          <Typography sx={{ fontFamily: FONT_SERIF, fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 600, color: "#fff", mb: 1.5, lineHeight: 1.15 }}>
            Are you a <em style={{ color: "#5DCAA5", fontStyle: "italic" }}>trade professional?</em>
          </Typography>
          <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", mb: 5, lineHeight: 1.7, maxWidth: 500, mx: "auto" }}>
            List your business for free and start receiving bookings from customers in your area today.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button variant="contained" sx={{ bgcolor: T.tealMid, fontFamily: FONT_SANS, fontWeight: 600, px: 4, py: 1.6, borderRadius: "10px", boxShadow: "none", "&:hover": { bgcolor: "#5DCAA5", boxShadow: "none" } }}>
              Get listed for free
            </Button>
            <Button variant="outlined" sx={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff", fontFamily: FONT_SANS, fontWeight: 500, px: 4, py: 1.6, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.06)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
              Learn more
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.slate, borderTop: "1px solid rgba(255,255,255,0.08)", px: { xs: 2, md: 5 }, py: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Logo />
        <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
          © 2026 TradeHub Ltd. All rights reserved.
        </Typography>
        <Stack direction="row" spacing={3}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <Typography key={l} sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", cursor: "pointer", "&:hover": { color: "rgba(255,255,255,0.7)" } }}>{l}</Typography>
          ))}
        </Stack>
      </Box>

    </Box>
  );
}