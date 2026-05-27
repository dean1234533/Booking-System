/**
 * Home.jsx — TradeHub marketing homepage
 * Deep navy + gold premium aesthetic
 * MUI-based, matches existing codebase pattern
 * Nav and Footer are separate components — not included here
 */

import React, { useState, useEffect } from "react";
import {
  Box, Container, Typography, Grid, Paper,
  Button, Stack, Chip, InputBase,
} from "@mui/material";
import SearchIcon             from "@mui/icons-material/Search";
import LocationOnIcon         from "@mui/icons-material/LocationOn";
import ContentCutIcon         from "@mui/icons-material/ContentCut";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import PlumbingIcon           from "@mui/icons-material/Plumbing";
import BrushIcon              from "@mui/icons-material/Brush";
import FitnessCenterIcon      from "@mui/icons-material/FitnessCenter";
import YardIcon               from "@mui/icons-material/Yard";
import BuildIcon              from "@mui/icons-material/Build";
import SpaIcon                from "@mui/icons-material/Spa";
import VerifiedIcon           from "@mui/icons-material/Verified";
import ArrowForwardIcon       from "@mui/icons-material/ArrowForward";
import RocketLaunchIcon       from "@mui/icons-material/RocketLaunch";
import StarIcon               from "@mui/icons-material/Star";
import LanguageIcon           from "@mui/icons-material/Language";
import CalendarMonthIcon      from "@mui/icons-material/CalendarMonth";
import PaymentsIcon           from "@mui/icons-material/Payments";
import ReceiptLongIcon        from "@mui/icons-material/ReceiptLong";
import InstagramIcon          from "@mui/icons-material/Instagram";
import CheckCircleIcon        from "@mui/icons-material/CheckCircle";

import TenantHome from "./TenantHome";
import CategoryRow from "../components/CategoryRow";
import { useBarbers } from "../hooks/useBarbers";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const T = {
  navy:       "#0B1628",
  navyMid:    "#152238",
  navyLight:  "#1E3050",
  gold:       "#C9A84C",
  goldLight:  "#E8C96A",
  goldPale:   "#F7EDD6",
  goldDim:    "#7A5A1A",
  offWhite:   "#F5F3EE",
  white:      "#FFFFFF",
  muted:      "#8A96A8",
  border:     "#E8E4DC",
  borderDark: "rgba(255,255,255,0.08)",
};

const FONT_SERIF = "'Playfair Display', serif";
const FONT_SANS  = "'DM Sans', sans-serif";

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All",               icon: <BuildIcon />,              color: T.gold,    bg: T.goldPale   },
  { label: "Barbers",           icon: <ContentCutIcon />,         color: T.gold,    bg: T.goldPale   },
  { label: "Electricians",      icon: <ElectricalServicesIcon />, color: "#185FA5", bg: "#E6F1FB"    },
  { label: "Plumbers",          icon: <PlumbingIcon />,           color: "#185FA5", bg: "#E6F1FB"    },
  { label: "Decorators",        icon: <BrushIcon />,              color: "#993C1D", bg: "#FAECE7"    },
  { label: "Personal Trainers", icon: <FitnessCenterIcon />,      color: "#534AB7", bg: "#EEEDFE"    },
  { label: "Gardeners",         icon: <YardIcon />,               color: "#3B6D11", bg: "#EAF3DE"    },
  { label: "Beauty",            icon: <SpaIcon />,                color: "#993556", bg: "#FBEAF0"    },
];

const REVIEWS = [
  {
    initials: "MJ", name: "Marcus J.", trade: "Barber",
    text: "Found my go-to barber in minutes. The booking was seamless and he was exactly as advertised — proper quality.",
    avatarBg: T.goldPale, avatarColor: T.goldDim,
  },
  {
    initials: "ER", name: "Elena R.", trade: "Decorator",
    text: "Got a decorator sorted within a day. The reviews on here are genuine — no dodgy contractors, just verified pros.",
    avatarBg: "#FAECE7", avatarColor: "#993C1D",
  },
  {
    initials: "JT", name: "Jordan T.", trade: "Personal Trainer",
    text: "My PT is brilliant and I booked him entirely through TradeHub. Honestly the easiest experience I've had finding a trainer.",
    avatarBg: "#EEEDFE", avatarColor: "#534AB7",
  },
];

const HOW_STEPS = [
  { num: "1", icon: <SearchIcon />,        title: "Search & browse",  body: "Filter by trade, location, and rating to find exactly who you need." },
  { num: "2", icon: <StarIcon />,          title: "Compare & choose", body: "Read reviews, check availability, and pick the best fit for your job." },
  { num: "3", icon: <CalendarMonthIcon />, title: "Book instantly",   body: "Confirm your slot in seconds. No phone calls, no waiting around." },
];

const BUSINESS_FEATURES = [
  { icon: <LanguageIcon />,    label: "Custom domain or link your own"              },
  { icon: <CalendarMonthIcon />, label: "Time-slot booking system"                  },
  { icon: <PaymentsIcon />,    label: "Stripe payments, deposits & invoices"        },
  { icon: <ReceiptLongIcon />, label: "Face-to-face payments & receipts"            },
  { icon: <InstagramIcon />,   label: "Instagram, TikTok, Facebook & YouTube"       },
  { icon: <BuildIcon />,       label: "Customise images, text & branding"           },
];

// ── Shared components ─────────────────────────────────────────────────────────
function SectionLabel({ children, light = false }) {
  return (
    <Typography sx={{
      fontFamily: FONT_SANS,
      fontSize: "0.62rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: light ? "rgba(201,168,76,0.6)" : T.gold,
      mb: 0.8,
    }}>
      {children}
    </Typography>
  );
}

function SectionTitle({ children, light = false, center = false }) {
  return (
    <Typography sx={{
      fontFamily: FONT_SERIF,
      fontSize: { xs: "1.6rem", md: "2rem" },
      fontWeight: 600,
      color: light ? T.white : T.navy,
      lineHeight: 1.2,
      textAlign: center ? "center" : "left",
    }}>
      {children}
    </Typography>
  );
}

function GoldButton({ children, startIcon, href, onClick, outlined = false, large = false }) {
  return (
    <Button
      component={href ? "a" : "button"}
      href={href}
      onClick={onClick}
      startIcon={startIcon}
      variant={outlined ? "outlined" : "contained"}
      sx={{
        fontFamily: FONT_SANS,
        fontWeight: 600,
        fontSize: large ? "0.88rem" : "0.82rem",
        px: large ? 4 : 3,
        py: large ? 1.6 : 1.2,
        borderRadius: "8px",
        boxShadow: "none",
        ...(outlined ? {
          borderColor: "rgba(255,255,255,0.25)",
          color: T.white,
          bgcolor: "rgba(255,255,255,0.06)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.4)", boxShadow: "none" },
        } : {
          bgcolor: T.gold,
          color: T.navy,
          "&:hover": { bgcolor: T.goldLight, boxShadow: "none" },
        }),
      }}
    >
      {children}
    </Button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home({ tenant }) {
  const { barbers, loading } = useBarbers(!tenant);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);
  if (tenant) return <TenantHome tenant={tenant} />;

  return (
    <Box sx={{ bgcolor: T.white, minHeight: "100vh", overflowX: "hidden", fontFamily: FONT_SANS }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.navy, pt: { xs: 9, md: 12 }, pb: 0, position: "relative", overflow: "hidden" }}>
        {/* Gold top accent */}
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, bgcolor: T.gold }} />

        {/* Background watermark */}
        <Typography sx={{
          position: "absolute", right: -40, top: 20,
          fontFamily: FONT_SERIF, fontSize: { xs: "8rem", md: "14rem" },
          fontWeight: 600, color: "rgba(255,255,255,0.02)",
          lineHeight: 1, pointerEvents: "none", userSelect: "none",
        }}>
          Pro
        </Typography>

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          {/* Badge */}
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 1,
            bgcolor: "rgba(201,168,76,0.12)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: "99px", px: 2, py: 0.7, mb: 3.5,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: T.gold }} />
            <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", fontWeight: 500, color: T.gold, letterSpacing: "0.04em" }}>
              The UK's premium trades & services marketplace
            </Typography>
          </Box>

          {/* Headline */}
          <Typography sx={{
            fontFamily: FONT_SERIF, fontWeight: 600, color: T.white,
            fontSize: { xs: "2.6rem", md: "3.8rem", lg: "4.5rem" },
            lineHeight: 1.08, letterSpacing: "-0.02em", mb: 2.5,
          }}>
            Your business,<br />your own{" "}
            <Box component="em" sx={{ color: T.gold, fontStyle: "italic" }}>website</Box>
          </Typography>

          {/* Subtitle */}
          <Typography sx={{
            fontFamily: FONT_SANS, fontSize: { xs: "0.95rem", md: "1.05rem" },
            color: "rgba(255,255,255,0.55)", lineHeight: 1.8, maxWidth: 520, mb: 5,
          }}>
            Sign up free and get your own hosted business website — custom domain,
            booking system, Stripe payments, invoicing and more. One flat fee. Everything included.
          </Typography>

          {/* CTAs */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={7}>
            <GoldButton startIcon={<RocketLaunchIcon />} href="/signup" large>
              Start for free
            </GoldButton>
            <GoldButton outlined href="#browse" large>
              Browse professionals
            </GoldButton>
          </Stack>

          {/* Stats */}
          <Stack direction="row" sx={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { num: "2,400+", label: "Verified professionals" },
              { num: "18+",    label: "Trade categories"       },
              { num: "4.9★",   label: "Average rating"         },
            ].map((s, i) => (
              <Box key={i} sx={{
                py: 2.5, pr: 4, mr: 4,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "1.7rem", fontWeight: 600, color: T.white, lineHeight: 1 }}>
                  <Box component="span" sx={{ color: T.gold }}>{s.num}</Box>
                </Typography>
                <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", mt: 0.5, letterSpacing: "0.03em" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── SEARCH BAR ───────────────────────────────────────────────────── */}
      <Box id="browse" sx={{ bgcolor: T.white, borderBottom: `1px solid ${T.border}`, px: { xs: 2, md: 5 }, py: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
          <Box sx={{
            flex: 1, display: "flex", alignItems: "center", gap: 1.5,
            border: `1.5px solid ${T.border}`, borderRadius: "10px",
            px: 2, height: 46,
            "&:focus-within": { borderColor: T.gold },
            transition: "border-color .2s",
          }}>
            <SearchIcon sx={{ color: T.muted, fontSize: 18 }} />
            <InputBase
              placeholder='What service do you need? e.g. "barber", "plumber"'
              sx={{ flex: 1, fontFamily: FONT_SANS, fontSize: "0.875rem" }}
            />
          </Box>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            border: `1.5px solid ${T.border}`, borderRadius: "10px",
            px: 2, height: 46, minWidth: 160,
            "&:focus-within": { borderColor: T.gold },
            transition: "border-color .2s",
          }}>
            <LocationOnIcon sx={{ color: T.muted, fontSize: 18 }} />
            <InputBase placeholder="Location" sx={{ flex: 1, fontFamily: FONT_SANS, fontSize: "0.875rem" }} />
          </Box>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            sx={{
              height: 46, px: 3.5, bgcolor: T.gold, color: T.navy,
              fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.82rem",
              borderRadius: "10px", boxShadow: "none", whiteSpace: "nowrap",
              "&:hover": { bgcolor: T.goldLight, boxShadow: "none" },
            }}
          >
            Search
          </Button>
        </Stack>
      </Box>

      {/* ── CATEGORY PILLS ───────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: T.white, borderBottom: `1px solid ${T.border}`,
        px: { xs: 2, md: 5 }, py: 1.5,
        overflowX: "auto", display: "flex", gap: 1,
        "&::-webkit-scrollbar": { display: "none" },
      }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.label}
            icon={React.cloneElement(cat.icon, {
              style: { fontSize: 15, color: activeCategory === cat.label ? cat.color : T.muted },
            })}
            label={cat.label}
            onClick={() => setActiveCategory(cat.label)}
            sx={{
              fontFamily: FONT_SANS, fontSize: "0.75rem", fontWeight: 500,
              cursor: "pointer", whiteSpace: "nowrap",
              bgcolor:     activeCategory === cat.label ? cat.bg    : T.white,
              color:       activeCategory === cat.label ? cat.color : T.muted,
              borderColor: activeCategory === cat.label ? cat.color : T.border,
              border: "1.5px solid",
              borderRadius: "99px",
              transition: "all .2s",
              "&:hover": { bgcolor: cat.bg, color: cat.color, borderColor: cat.color },
              "& .MuiChip-icon": { ml: 1 },
            }}
          />
        ))}
      </Box>

      {/* ── LISTINGS ─────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.offWhite, py: { xs: 6, md: 10 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg" disableGutters>

          {["Barbers", "Decorators", "Personal Trainers"].map((type, i) => {
            const labels = [
              { section: "Grooming",       title: "Top-rated barbers near you"       },
              { section: "Home Trades",    title: "Trusted tradespeople near you"     },
              { section: "Health & Fitness", title: "Personal trainers in your area" },
            ];
            return (
              <Box key={type} sx={{ mb: i < 2 ? 7 : 0 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
                  <Box>
                    <SectionLabel>{labels[i].section}</SectionLabel>
                    <SectionTitle>{labels[i].title}</SectionTitle>
                  </Box>
                  <Button
                    endIcon={<ArrowForwardIcon />}
                    sx={{ color: T.gold, fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    See all
                  </Button>
                </Box>
                <CategoryRow
                  title={type}
                  businessType={type.toLowerCase().replace(" ", "")}
                  allBusinesses={barbers}
                />
              </Box>
            );
          })}

        </Container>
      </Box>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.navy, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 7 }}>
            <SectionLabel light>Simple process</SectionLabel>
            <SectionTitle light center>Book in three steps</SectionTitle>
          </Box>
          <Grid container spacing={4}>
            {HOW_STEPS.map(step => (
              <Grid item xs={12} md={4} key={step.num}>
                <Box sx={{ textAlign: "center" }}>
                  <Box sx={{
                    width: 52, height: 52, borderRadius: "50%",
                    bgcolor: "rgba(201,168,76,0.12)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mx: "auto", mb: 2,
                    "& svg": { color: T.gold, fontSize: 22 },
                  }}>
                    {step.icon}
                  </Box>
                  <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "1.3rem", fontWeight: 600, color: T.white, mb: 0.5 }}>
                    {step.num}. {step.title}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.83rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                    {step.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── FOR BUSINESSES ───────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.white, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">

            {/* Copy */}
            <Grid item xs={12} md={6}>
              <SectionLabel>For businesses</SectionLabel>
              <SectionTitle>Everything you need to run your business</SectionTitle>
              <Typography sx={{
                fontFamily: FONT_SANS, fontSize: "0.95rem", color: T.muted,
                lineHeight: 1.8, mt: 1.5, mb: 3,
              }}>
                When you join TradeHub you get your own fully-hosted business website.
                Customise it, link your own domain, and manage every part of your
                business from one dashboard — no tech skills needed.
              </Typography>

              <Stack spacing={1.2} mb={4}>
                {BUSINESS_FEATURES.map((f, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: "8px",
                      bgcolor: T.goldPale,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      "& svg": { color: T.goldDim, fontSize: 17 },
                    }}>
                      {f.icon}
                    </Box>
                    <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.875rem", fontWeight: 500, color: T.navy }}>
                      {f.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<RocketLaunchIcon />}
                  href="/signup"
                  sx={{
                    bgcolor: T.gold, color: T.navy, fontFamily: FONT_SANS,
                    fontWeight: 600, px: 3, py: 1.4, borderRadius: "8px",
                    boxShadow: "none", "&:hover": { bgcolor: T.goldLight, boxShadow: "none" },
                  }}
                >
                  Get listed for free
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: T.border, color: T.navy, fontFamily: FONT_SANS,
                    fontWeight: 500, px: 3, py: 1.4, borderRadius: "8px",
                    "&:hover": { borderColor: T.gold },
                  }}
                >
                  Learn more
                </Button>
              </Stack>
            </Grid>

            {/* Dashboard preview card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{
                bgcolor: T.navy, borderRadius: 4, p: 3,
                border: "1px solid rgba(201,168,76,0.2)",
              }}>
                {/* Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                  <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.82rem", fontWeight: 600, color: T.white }}>
                    My Dashboard
                  </Typography>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: T.gold }} />
                </Box>

                {/* Stats */}
                <Grid container spacing={1.5} mb={2}>
                  {[
                    { label: "This month", val: "£3,240" },
                    { label: "Bookings",   val: "42"      },
                  ].map(s => (
                    <Grid item xs={6} key={s.label}>
                      <Box sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, p: 1.5 }}>
                        <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                          {s.label}
                        </Typography>
                        <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "1.4rem", fontWeight: 600, color: T.gold }}>
                          {s.val}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Bookings list */}
                <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1 }}>
                  Upcoming bookings
                </Typography>
                <Stack spacing={1}>
                  {[
                    { name: "James R. — Cut & Beard", time: "Today · 2:00 PM",      status: "Confirmed", statusColor: "#5DCAA5", statusBg: "rgba(26,92,56,0.3)" },
                    { name: "Sarah M. — Full Colour",  time: "Tomorrow · 11:30 AM", status: "Pending",   statusColor: T.gold,   statusBg: "rgba(201,168,76,0.15)" },
                    { name: "Tom K. — Haircut",        time: "Thu · 4:00 PM",       status: "Confirmed", statusColor: "#5DCAA5", statusBg: "rgba(26,92,56,0.3)" },
                  ].map((b, i) => (
                    <Box key={i} sx={{
                      bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2,
                      px: 1.5, py: 1.2,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 500, color: T.white }}>{b.name}</Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", mt: 0.3 }}>{b.time}</Typography>
                      </Box>
                      <Box sx={{
                        bgcolor: b.statusBg, color: b.statusColor,
                        fontSize: "0.65rem", fontWeight: 600,
                        px: 1.2, py: 0.4, borderRadius: "99px",
                      }}>
                        {b.status}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

          </Grid>
        </Container>
      </Box>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.offWhite, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <SectionLabel>Pricing</SectionLabel>
            <SectionTitle center>One plan. Everything included.</SectionTitle>
            <Typography sx={{
              fontFamily: FONT_SANS, fontSize: "0.95rem", color: T.muted,
              lineHeight: 1.8, mt: 1.5,
            }}>
              No feature tiers. No stripped-down plans. Every business gets the full platform.
            </Typography>
          </Box>

          <Paper elevation={0} sx={{
            border: `2px solid ${T.gold}`,
            borderRadius: 4, overflow: "hidden",
          }}>
            {/* Gold header */}
            <Box sx={{ bgcolor: T.navy, px: 4, py: 3, textAlign: "center" }}>
              <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", mb: 1 }}>
                Full access
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 0.5 }}>
                <Typography sx={{ fontFamily: FONT_SERIF, fontSize: "3.5rem", fontWeight: 600, color: T.gold, lineHeight: 1 }}>
                  £10
                </Typography>
                <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>
                  / month
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
                + 2.5% on each Stripe transaction · Free for 30 days
              </Typography>
            </Box>

            {/* Features */}
            <Box sx={{ px: 4, py: 3 }}>
              <Stack spacing={1.5}>
                {[
                  "Your own hosted business website",
                  "Custom domain (buy or link your own)",
                  "Time-slot booking system",
                  "Stripe payments, deposits & invoicing",
                  "Face-to-face & remote payments",
                  "Instagram, TikTok, Facebook & YouTube links",
                  "Customise images, text & branding",
                  "Profile photo & business details",
                  "30-day free trial — no card required",
                ].map((f, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: T.gold, fontSize: 18, flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.875rem", color: T.navy }}>
                      {f}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Button
                fullWidth
                variant="contained"
                href="/signup"
                startIcon={<RocketLaunchIcon />}
                sx={{
                  mt: 3, bgcolor: T.gold, color: T.navy,
                  fontFamily: FONT_SANS, fontWeight: 700, fontSize: "0.88rem",
                  py: 1.6, borderRadius: "10px", boxShadow: "none",
                  "&:hover": { bgcolor: T.goldLight, boxShadow: "none" },
                }}
              >
                Start your free 30 days
              </Button>
              <Typography sx={{
                fontFamily: FONT_SANS, fontSize: "0.72rem", color: T.muted,
                textAlign: "center", mt: 1,
              }}>
                No card required · Cancel anytime
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.white, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 5 }}>
            <SectionLabel>Testimonials</SectionLabel>
            <SectionTitle>Trusted by thousands</SectionTitle>
          </Box>
          <Grid container spacing={3}>
            {REVIEWS.map((rev, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper elevation={0} sx={{
                  p: 3.5, bgcolor: T.offWhite,
                  border: `1px solid ${T.border}`, borderRadius: 3, height: "100%",
                }}>
                  <Stack direction="row" spacing={0.4} mb={2}>
                    {[1,2,3,4,5].map(j => (
                      <StarIcon key={j} sx={{ color: T.gold, fontSize: 15 }} />
                    ))}
                  </Stack>
                  <Typography sx={{
                    fontFamily: FONT_SANS, fontSize: "0.875rem",
                    fontStyle: "italic", color: "#374955", lineHeight: 1.75, mb: 2.5,
                  }}>
                    "{rev.text}"
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 36, height: 36, borderRadius: "50%",
                      bgcolor: rev.avatarBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", fontWeight: 700, color: rev.avatarColor }}>
                        {rev.initials}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.82rem", color: T.navy }}>
                        {rev.name}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT_SANS, fontSize: "0.72rem", color: T.muted }}>
                        Booked: {rev.trade}
                      </Typography>
                    </Box>
                    <VerifiedIcon sx={{ color: T.gold, fontSize: 16, ml: "auto" }} />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.navy, py: { xs: 10, md: 14 }, px: { xs: 2, md: 5 }, textAlign: "center" }}>
        <Container maxWidth="md">
          <SectionLabel light>Join the platform</SectionLabel>
          <Typography sx={{
            fontFamily: FONT_SERIF, fontSize: { xs: "1.9rem", md: "2.8rem" },
            fontWeight: 600, color: T.white, mb: 1.5, lineHeight: 1.15, mt: 1,
          }}>
            Are you a{" "}
            <Box component="em" sx={{ color: T.gold, fontStyle: "italic" }}>trade professional?</Box>
          </Typography>
          <Typography sx={{
            fontFamily: FONT_SANS, fontSize: "0.95rem",
            color: "rgba(255,255,255,0.45)", mb: 5, lineHeight: 1.7,
            maxWidth: 500, mx: "auto",
          }}>
            List your business for free and start receiving bookings from customers in your area.
            Your own website. Your own domain. £10/mo after your free trial.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <GoldButton startIcon={<RocketLaunchIcon />} href="/signup" large>
              Get listed for free
            </GoldButton>
            <GoldButton outlined large>
              Learn more
            </GoldButton>
          </Stack>
        </Container>
      </Box>

    </Box>
  );
}