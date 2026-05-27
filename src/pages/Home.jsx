import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Container, Typography, Grid, Paper,
  Skeleton, Button, Stack, Chip, InputBase,
  useMediaQuery, useTheme, IconButton,
} from "@mui/material";
import SearchIcon             from "@mui/icons-material/Search";
import LocationOnIcon         from "@mui/icons-material/LocationOn";
import StarIcon               from "@mui/icons-material/Star";
import ContentCutIcon         from "@mui/icons-material/ContentCut";
import BrushIcon              from "@mui/icons-material/Brush";
import FitnessCenterIcon      from "@mui/icons-material/FitnessCenter";
import GridViewRoundedIcon    from "@mui/icons-material/GridViewRounded";
import VerifiedIcon           from "@mui/icons-material/Verified";
import ArrowForwardIcon       from "@mui/icons-material/ArrowForward";
import ArrowBackIcon          from "@mui/icons-material/ArrowBack";
import PublicIcon             from "@mui/icons-material/Public";
import CalendarMonthIcon      from "@mui/icons-material/CalendarMonth";
import PaymentIcon            from "@mui/icons-material/Payment";
import InsertDriveFileIcon    from "@mui/icons-material/InsertDriveFile";
import InstagramIcon          from "@mui/icons-material/Instagram";
import YouTubeIcon            from "@mui/icons-material/YouTube";
import CheckCircleIcon        from "@mui/icons-material/CheckCircle";
import CategoryRow            from "../components/CategoryRow";
import TenantHome             from "./TenantHome";
import { useBarbers }         from "../hooks/useBarbers";
import { useNavigate }        from "react-router-dom";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const G = {
  gold:      "#C9A84C",
  goldLight: "#e8c97a",
  goldPale:  "#f5e9c8",
  goldAlpha: "rgba(201,168,76,0.12)",
  dark:      "#0d0d0d",
  dark2:     "#1a1a1a",
  warmWhite: "#faf8f4",
  cream:     "#f2ede3",
  muted:     "#7a7060",
  border:    "#e8e2d8",
};
const SERIF  = "'Playfair Display', serif";
const SANS   = "'DM Sans', sans-serif";
const ITALIC = "'Cormorant Garamond', serif";

const CATEGORIES = [
  { label: "All",               icon: <GridViewRoundedIcon />, color: G.gold,    bg: G.goldPale  },
  { label: "Barbers",           icon: <ContentCutIcon />,      color: G.gold,    bg: G.goldPale  },
  { label: "Decorators",        icon: <BrushIcon />,           color: "#7a3520", bg: "#f5e8e3"   },
  { label: "Personal Trainers", icon: <FitnessCenterIcon />,   color: "#3d2c0e", bg: "#f0e4cc"   },
];

const CAT_TYPE_MAP = {
  "Barbers":           "barber",
  "Decorators":        "decorator",
  "Personal Trainers": "trainer",
};

const SECTIONS = [
  { label: "Grooming",          title: "Top-rated barbers near you",      type: "barber"    },
  { label: "Home Decorating",   title: "Skilled decorators near you",     type: "decorator" },
  { label: "Health & Fitness",  title: "Personal trainers in your area",  type: "trainer"   },
];

const REVIEWS = [
  { name: "Marcus J.", initials: "MJ", text: "Found my go-to barber in minutes. The booking was seamless — proper quality.", trade: "Barber" },
  { name: "Elena R.",  initials: "ER", text: "Got a decorator sorted within a day. The reviews are genuine — only verified pros.", trade: "Decorator" },
  { name: "Jordan T.", initials: "JT", text: "My PT is brilliant. Booked him entirely through here. Easiest experience I've ever had.", trade: "Personal Trainer" },
];

const PLATFORM_FEATURES = [
  { icon: <PublicIcon sx={{ fontSize: 26 }} />,            title: "Your own website",       body: "Buy a custom domain or link your existing one. Every business gets a fully branded site — personalised with your images, text, and social links." },
  { icon: <CalendarMonthIcon sx={{ fontSize: 26 }} />,     title: "Booking system",         body: "Clients pick a time slot and book directly. Set your availability, services, and let the calendar run itself. No back-and-forth." },
  { icon: <PaymentIcon sx={{ fontSize: 26 }} />,           title: "Payments & deposits",    body: "Connect Stripe to take online payments, set deposits, and accept face-to-face payments. Full control over how you get paid." },
  { icon: <InsertDriveFileIcon sx={{ fontSize: 26 }} />,   title: "Invoicing built in",     body: "Send professional invoices to clients in seconds. Track what's paid and what's pending — all from your dashboard." },
  { icon: <InstagramIcon sx={{ fontSize: 26 }} />,         title: "Social & media",         body: "Add your Instagram, TikTok, and Facebook links. Host a YouTube video directly on your site — let your work speak for itself." },
  { icon: <YouTubeIcon sx={{ fontSize: 26 }} />,           title: "Dashboard control",      body: "Customise your site, manage bookings, update your profile, and track your business — all from one clean dashboard." },
];

const HOW_STEPS = [
  { num: "01", title: "Sign up & set up",     body: "Create your account, choose your business type, and fill in your profile. Takes less than 5 minutes." },
  { num: "02", title: "Get your site",        body: "Buy a custom domain or link your own. Your branded business page goes live instantly." },
  { num: "03", title: "Start taking bookings", body: "Connect Stripe, set your availability, and let clients book directly through your site." },
];

function SectionLabel({ text }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Box sx={{ width: 24, height: 1, bgcolor: G.gold }} />
      <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: G.gold }}>
        {text}
      </Typography>
    </Box>
  );
}

export default function Home({ tenant }) {
  const { barbers, loading } = useBarbers();
  const navigate = useNavigate();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [activeCategory,  setActiveCategory]  = useState("All");
  const [searchService,   setSearchService]   = useState("");
  const [searchLocation,  setSearchLocation]  = useState("");
  const [pendingService,  setPendingService]  = useState("");
  const [pendingLocation, setPendingLocation] = useState("");
  const [revIdx, setRevIdx] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);

  // Auto-advance reviews
  useEffect(() => {
    const t = setInterval(() => setRevIdx(i => (i + 1) % REVIEWS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prevRev = () => setRevIdx(i => (i - 1 + REVIEWS.length) % REVIEWS.length);
  const nextRev = () => setRevIdx(i => (i + 1) % REVIEWS.length);

  if (tenant) return <TenantHome tenant={tenant} />;

  const filteredBarbers = useMemo(() => {
    return barbers.filter(b => {
      const type = b.businessType || "barber";
      const matchesCat = activeCategory === "All" || type === CAT_TYPE_MAP[activeCategory];
      const q = searchService.toLowerCase().trim();
      const matchesSvc = !q ||
        b.businessName?.toLowerCase().includes(q) ||
        b.displayName?.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        b.specialty?.toLowerCase().includes(q) ||
        b.aboutUs?.toLowerCase().includes(q);
      const loc = searchLocation.toLowerCase().trim();
      const matchesLoc = !loc ||
        b.address?.toLowerCase().includes(loc) ||
        b.city?.toLowerCase().includes(loc);
      return matchesCat && matchesSvc && matchesLoc;
    });
  }, [barbers, activeCategory, searchService, searchLocation]);

  const visibleSections = useMemo(() => {
    if (activeCategory === "All") return SECTIONS;
    const targetType = CAT_TYPE_MAP[activeCategory];
    return SECTIONS.filter(s => s.type === targetType);
  }, [activeCategory]);

  const handleSearch = () => {
    setSearchService(pendingService);
    setSearchLocation(pendingLocation);
    document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const rev = REVIEWS[revIdx];

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: SANS }}>

      {/* ── HERO ── */}
      <Box sx={{
        bgcolor: G.dark,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Gold top stripe */}
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${G.gold}, transparent)`, zIndex: 1 }} />

        {/* Decorative bg text */}
        <Typography sx={{
          position: "absolute", right: { xs: -16, md: -24 }, top: 10,
          fontFamily: SERIF, fontSize: { xs: "10rem", md: "18rem" }, fontWeight: 400,
          color: "rgba(201,168,76,0.04)", lineHeight: 1,
          pointerEvents: "none", userSelect: "none", zIndex: 0,
        }}>
          Book
        </Typography>

        {/* Main content — vertically centred */}
        <Container maxWidth="lg" sx={{
          flex: 1, display: "flex", alignItems: "center",
          pt: { xs: "80px", md: "96px" }, pb: { xs: 4, md: 6 },
          position: "relative", zIndex: 1,
        }}>
          <Box sx={{ width: "100%", maxWidth: { md: 680 } }}>
            {/* Badge */}
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 1,
              bgcolor: G.goldAlpha, border: `1px solid rgba(201,168,76,0.3)`,
              borderRadius: "99px", px: 2, py: 0.7, mb: 3,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: G.gold }} />
              <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 500, color: G.goldLight, letterSpacing: "0.04em" }}>
                The UK's premier bookings marketplace
              </Typography>
            </Box>

            {/* Title */}
            <Typography sx={{
              fontFamily: SERIF, fontWeight: 400, color: "#fff",
              fontSize: { xs: "2.5rem", sm: "3.2rem", md: "4rem", lg: "4.8rem" },
              lineHeight: 1.08, letterSpacing: "-0.02em", mb: 2.5,
            }}>
              Find & book the right<br />
              <em style={{ fontStyle: "italic", color: G.gold }}>professional</em> near you
            </Typography>

            <Typography sx={{
              fontFamily: SANS, fontSize: { xs: "0.9rem", md: "1rem" }, fontWeight: 300,
              color: "rgba(255,255,255,0.55)", lineHeight: 1.8, maxWidth: 500, mb: 4,
            }}>
              From barbers and decorators to personal trainers — browse, compare, and book vetted local professionals in minutes.
            </Typography>

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                startIcon={<SearchIcon />}
                variant="contained"
                onClick={() => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" })}
                sx={{
                  bgcolor: G.gold, color: G.dark,
                  fontFamily: SANS, fontWeight: 700, fontSize: "0.85rem",
                  px: 3.5, py: 1.6, borderRadius: "2px", boxShadow: "none",
                  "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
                }}
              >
                Find a professional
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/signup")}
                sx={{
                  borderColor: "rgba(201,168,76,0.4)", color: G.goldLight,
                  fontFamily: SANS, fontWeight: 500, fontSize: "0.85rem",
                  px: 3.5, py: 1.6, borderRadius: "2px",
                  bgcolor: "rgba(201,168,76,0.06)",
                  "&:hover": { bgcolor: "rgba(201,168,76,0.12)", borderColor: G.gold },
                }}
              >
                List your business
              </Button>
            </Stack>
          </Box>
        </Container>

        {/* Stats bar — pinned to bottom of hero */}
        <Box sx={{ borderTop: `1px solid rgba(255,255,255,0.08)`, position: "relative", zIndex: 1 }}>
          <Container maxWidth="lg">
            <Stack
              direction={{ xs: "row", sm: "row" }}
              sx={{ flexWrap: { xs: "wrap", sm: "nowrap" } }}
            >
              {[
                { num: "2,400+", label: "Verified professionals" },
                { num: "3",      label: "Trade categories" },
                { num: "4.9★",   label: "Average rating" },
              ].map((s, i) => (
                <Box key={i} sx={{
                  py: 2.5, pr: { xs: 3, sm: 4 }, mr: { xs: 3, sm: 4 },
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  minWidth: { xs: "auto", sm: 0 },
                }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.3rem", sm: "1.8rem" }, fontWeight: 400, color: G.gold, lineHeight: 1 }}>
                    {s.num}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: { xs: "0.65rem", sm: "0.72rem" }, color: "rgba(255,255,255,0.35)", mt: 0.5, letterSpacing: "0.03em" }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* ── SEARCH BAR ── */}
      <Box sx={{ bgcolor: G.dark2, borderBottom: `1px solid rgba(201,168,76,0.15)`, px: { xs: 2, md: 5 }, py: 2 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="stretch">
            <Box sx={{
              flex: 1, display: "flex", alignItems: "center", gap: 1.5,
              border: `1.5px solid rgba(255,255,255,0.1)`, borderRadius: "2px",
              px: 2, height: 48, bgcolor: "rgba(255,255,255,0.04)",
              "&:focus-within": { borderColor: G.gold }, transition: "border-color .2s",
            }}>
              <SearchIcon sx={{ color: G.muted, fontSize: 18, flexShrink: 0 }} />
              <InputBase
                value={pendingService}
                onChange={e => setPendingService(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder='Service, e.g. "barber", "fade"'
                sx={{ flex: 1, fontFamily: SANS, fontSize: "0.875rem", color: "#fff",
                  "& input::placeholder": { color: "rgba(255,255,255,0.3)" } }}
              />
            </Box>
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1.5,
              border: `1.5px solid rgba(255,255,255,0.1)`, borderRadius: "2px",
              px: 2, height: 48, minWidth: { sm: 180 }, bgcolor: "rgba(255,255,255,0.04)",
              "&:focus-within": { borderColor: G.gold }, transition: "border-color .2s",
            }}>
              <LocationOnIcon sx={{ color: G.muted, fontSize: 18, flexShrink: 0 }} />
              <InputBase
                value={pendingLocation}
                onChange={e => setPendingLocation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Location, e.g. Stratford"
                sx={{ flex: 1, fontFamily: SANS, fontSize: "0.875rem", color: "#fff",
                  "& input::placeholder": { color: "rgba(255,255,255,0.3)" } }}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{
                height: 48, px: 3.5, bgcolor: G.gold, color: G.dark,
                fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem",
                borderRadius: "2px", boxShadow: "none", whiteSpace: "nowrap",
                "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
              }}
            >
              Search
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── CATEGORY PILLS ── */}
      <Box id="browse-section" sx={{
        bgcolor: G.dark2, borderBottom: `1px solid rgba(201,168,76,0.1)`,
        px: { xs: 2, md: 5 }, py: 1.5, overflowX: "auto", display: "flex", gap: 1,
        "&::-webkit-scrollbar": { display: "none" },
      }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.label}
            icon={React.cloneElement(cat.icon, {
              style: { fontSize: 14, color: activeCategory === cat.label ? cat.color : "rgba(255,255,255,0.4)" }
            })}
            label={cat.label}
            onClick={() => setActiveCategory(cat.label)}
            sx={{
              fontFamily: SANS, fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
              bgcolor:     activeCategory === cat.label ? cat.bg    : "rgba(255,255,255,0.05)",
              color:       activeCategory === cat.label ? cat.color : "rgba(255,255,255,0.55)",
              borderColor: activeCategory === cat.label ? cat.color : "rgba(255,255,255,0.1)",
              border: "1.5px solid", borderRadius: "99px", flexShrink: 0,
              transition: "all .2s",
              "&:hover": { bgcolor: cat.bg, color: cat.color, borderColor: cat.color },
              "& .MuiChip-icon": { ml: 1 },
            }}
          />
        ))}
      </Box>

      {/* ── LISTINGS ── */}
      <Box sx={{ bgcolor: G.warmWhite, py: { xs: 6, md: 10 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg" disableGutters>
          {loading ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map(i => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <>
              {visibleSections.map(({ label, title, type }) => (
                <CategoryRow
                  key={type}
                  label={label}
                  title={title}
                  businessType={type}
                  businesses={filteredBarbers}
                />
              ))}

              {/* Empty state when search returns nothing */}
              {filteredBarbers.length === 0 && (
                <Box sx={{ textAlign: "center", py: 10 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: G.dark, mb: 1 }}>
                    No results found
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: G.muted, mb: 3 }}>
                    Try a different location or service name.
                  </Typography>
                  <Button onClick={() => { setSearchService(""); setSearchLocation(""); setPendingService(""); setPendingLocation(""); setActiveCategory("All"); }}
                    sx={{ color: G.gold, fontWeight: 700 }}>
                    Clear filters
                  </Button>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>

      {/* ── PLATFORM FEATURES ── */}
      <Box sx={{ bgcolor: G.dark, py: { xs: 10, md: 16 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <SectionLabel text="For businesses" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 400, color: "#fff", mt: 0.5 }}>
              Everything you need to run your business
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", color: "rgba(255,255,255,0.45)", mt: 2, maxWidth: 560, mx: "auto", lineHeight: 1.8 }}>
              Sign up and get your own professional website, booking system, payments, and more — all in one place.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {PLATFORM_FEATURES.map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box sx={{
                  p: { xs: 3, md: 4 },
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(201,168,76,0.12)",
                  height: "100%",
                  transition: "border-color .25s, background .25s",
                  "&:hover": { borderColor: "rgba(201,168,76,0.4)", bgcolor: "rgba(201,168,76,0.04)" },
                }}>
                  <Box sx={{ color: G.gold, mb: 2.5 }}>{f.icon}</Box>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", fontWeight: 400, color: "#fff", mb: 1.5 }}>{f.title}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>{f.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <Button variant="contained" onClick={() => navigate("/signup")}
              sx={{ bgcolor: G.gold, color: G.dark, fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", px: 5, py: 1.8, borderRadius: "2px", boxShadow: "none", "&:hover": { bgcolor: G.goldLight, boxShadow: "none" } }}>
              Start for free →
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box sx={{ bgcolor: G.cream, py: { xs: 10, md: 14 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <SectionLabel text="How it works" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Up and running in minutes
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 3, md: 4 }}>
            {HOW_STEPS.map((step, i) => (
              <Grid item xs={12} md={4} key={step.num}>
                <Box sx={{ position: "relative", pl: 3, borderLeft: `2px solid ${i === 1 ? G.gold : "rgba(201,168,76,0.25)"}` }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "2.5rem", fontWeight: 400, color: `rgba(201,168,76,${i === 1 ? "0.6" : "0.25"})`, lineHeight: 1, mb: 1.5 }}>
                    {step.num}
                  </Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", fontWeight: 400, color: G.dark, mb: 1 }}>{step.title}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: G.muted, lineHeight: 1.75 }}>{step.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── REVIEWS (auto-sliding) ── */}
      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 }, borderTop: `1px solid ${G.border}` }}>
        <style>{`@keyframes revFadeUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }`}</style>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <SectionLabel text="Testimonials" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Trusted by thousands
            </Typography>
          </Box>

          {/* Review card */}
          <Paper key={revIdx} elevation={0} sx={{
            p: { xs: 3, md: 5 }, bgcolor: G.warmWhite,
            border: `1px solid ${G.border}`, borderRadius: 0,
            animation: "revFadeUp 0.45s ease both",
          }}>
            <Stack direction="row" spacing={0.4} mb={2.5} justifyContent="center">
              {[1,2,3,4,5].map(j => <StarIcon key={j} sx={{ color: G.gold, fontSize: { xs: 16, md: 18 } }} />)}
            </Stack>
            <Typography sx={{
              fontFamily: ITALIC, fontStyle: "italic",
              fontSize: { xs: "1.1rem", md: "1.3rem" },
              color: G.dark2, lineHeight: 1.75, mb: 3, textAlign: "center",
            }}>
              "{rev.text}"
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
              <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: G.goldPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700, color: G.gold }}>{rev.initials}</Typography>
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.85rem", color: G.dark }}>{rev.name}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: G.muted }}>Booked: {rev.trade}</Typography>
              </Box>
              <VerifiedIcon sx={{ color: G.gold, fontSize: 18, ml: 1 }} />
            </Stack>
          </Paper>

          {/* Controls */}
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} mt={3}>
            <IconButton onClick={prevRev} size="small" sx={{ border: `1px solid ${G.border}`, color: G.muted, "&:hover": { borderColor: G.gold, color: G.gold } }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Stack direction="row" spacing={0.75}>
              {REVIEWS.map((_, i) => (
                <Box key={i} onClick={() => setRevIdx(i)} sx={{
                  width: i === revIdx ? 24 : 8, height: 8, borderRadius: "99px",
                  bgcolor: i === revIdx ? G.gold : G.border,
                  cursor: "pointer", transition: "all .3s ease",
                }} />
              ))}
            </Stack>
            <IconButton onClick={nextRev} size="small" sx={{ border: `1px solid ${G.border}`, color: G.muted, "&:hover": { borderColor: G.gold, color: G.gold } }}>
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      {/* ── BUSINESS CTA ── */}
      <Box sx={{
        bgcolor: G.dark, py: { xs: 12, md: 18 }, px: { xs: 2, md: 5 },
        textAlign: "center", position: "relative", overflow: "hidden",
        borderTop: `2px solid ${G.gold}`,
      }}>
        <Box sx={{ position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)", fontFamily: SERIF, fontSize: { xs: "16rem", md: "26rem" }, color: "rgba(201,168,76,0.03)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
          &amp;
        </Box>
        <Container maxWidth="md" sx={{ position: "relative" }}>
          <SectionLabel text="Join the platform" />
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, color: "#fff", mb: 2, lineHeight: 1.15, mt: 1 }}>
            Are you a <em style={{ fontStyle: "italic", color: G.gold }}>trade professional?</em>
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", mb: 6, lineHeight: 1.8, maxWidth: 500, mx: "auto" }}>
            Get your own professional website, booking system, and payment tools — all connected to your business. List for free and start taking bookings today.
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 6, textAlign: "left", maxWidth: 560, mx: "auto" }}>
            {["Custom domain or link your own","Built-in Stripe payments & deposits","Online booking with time slots","Professional invoice sending","Instagram, TikTok & YouTube links","Full dashboard to manage everything"].map(item => (
              <Grid item xs={12} sm={6} key={item}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CheckCircleIcon sx={{ color: G.gold, fontSize: 16, flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>{item}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button variant="contained" onClick={() => navigate("/signup")}
              sx={{ bgcolor: G.gold, color: G.dark, fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", px: 5, py: 1.8, borderRadius: "2px", boxShadow: "none", "&:hover": { bgcolor: G.goldLight, boxShadow: "none" } }}>
              Get listed for free
            </Button>
            <Button variant="outlined" onClick={() => navigate("/login")}
              sx={{ borderColor: "rgba(201,168,76,0.3)", color: G.goldLight, fontFamily: SANS, fontWeight: 500, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", px: 5, py: 1.8, borderRadius: "2px", bgcolor: "rgba(201,168,76,0.05)", "&:hover": { bgcolor: "rgba(201,168,76,0.1)", borderColor: G.gold } }}>
              Professional login
            </Button>
          </Stack>
        </Container>
      </Box>

    </Box>
  );
}
