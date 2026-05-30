import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Container, Typography, Grid, Paper,
  Skeleton, Button, Stack, Chip, InputBase, TextField, Alert,
  useMediaQuery, useTheme, IconButton, CircularProgress,
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
import CategoryRow            from "../components/CategoryRow";
import TenantHome             from "./TenantHome";
import PricingModal           from "../components/PricingModal";
import FeatureComparisonModal from "../components/FeatureComparisonModal";
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
  { label: "Hairdressers",      icon: <ContentCutIcon />,      color: "#7c4e8a", bg: "#f5e8f5"   },
  { label: "Decorators",        icon: <BrushIcon />,           color: "#7a3520", bg: "#f5e8e3"   },
  { label: "Personal Trainers", icon: <FitnessCenterIcon />,   color: "#3d2c0e", bg: "#f0e4cc"   },
];

const CAT_TYPE_MAP = {
  "Barbers":           "barber",
  "Hairdressers":      "hairdresser",
  "Decorators":        "decorator",
  "Personal Trainers": "trainer",
};

const SECTIONS = [
  { label: "Grooming",          title: "Top-rated barbers near you",         type: "barber"      },
  { label: "Beauty & Hair",     title: "Top hairdressers near you",          type: "hairdresser" },
  { label: "Home Decorating",   title: "Skilled decorators near you",        type: "decorator"   },
  { label: "Health & Fitness",  title: "Personal trainers in your area",     type: "trainer"     },
];

const REVIEWS = [
  { name: "Sarah M.", initials: "SM", text: "Finally found a platform that actually works. Booked my hairdresser online and it was painless — no endless emails back and forth.", trade: "Hairdresser" },
  { name: "Tom W.",  initials: "TW", text: "As a barber, I set my availability once and clients book directly. No more phone calls. It's brilliant.", trade: "Barber" },
  { name: "Alex K.", initials: "AK", text: "We signed up as a decorator last month. The booking system is clean and the dashboard actually makes sense. Worth every penny.", trade: "Decorator" },
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

  const [activeCategory,  setActiveCategory]  = useState(() => isMobile ? "Barbers" : "All");
  const [searchService,   setSearchService]   = useState("");
  const [searchLocation,  setSearchLocation]  = useState("");
  const [pendingService,  setPendingService]  = useState("");
  const [pendingLocation, setPendingLocation] = useState("");
  const [revIdx,          setRevIdx]          = useState(0);
  const [pricingOpen,     setPricingOpen]     = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [feedbackName,    setFeedbackName]    = useState("");
  const [feedbackEmail,   setFeedbackEmail]   = useState("");
  const [feedbackText,    setFeedbackText]    = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);

  // Auto-advance reviews
  useEffect(() => {
    const t = setInterval(() => setRevIdx(i => (i + 1) % REVIEWS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prevRev = () => setRevIdx(i => (i - 1 + REVIEWS.length) % REVIEWS.length);
  const nextRev = () => setRevIdx(i => (i + 1) % REVIEWS.length);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackEmail.trim() || !feedbackText.trim()) {
      setFeedbackMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          email: feedbackEmail,
          message: feedbackText,
        }),
      });

      if (res.ok) {
        setFeedbackMessage({ type: "success", text: "Thanks! Your feedback has been sent." });
        setFeedbackName("");
        setFeedbackEmail("");
        setFeedbackText("");
      } else {
        const data = await res.json();
        setFeedbackMessage({ type: "error", text: data.error || "Failed to send feedback. Try again." });
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      setFeedbackMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

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

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: SANS }}>

      {/* ── HERO ── */}
      <Box sx={{
        bgcolor: G.dark,
        minHeight: { xs: "auto", md: "100vh" },
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
          pt: { xs: "80px", md: "96px" }, pb: { xs: 6, md: 6 },
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
            <Stack direction="row" sx={{ flexWrap: "nowrap" }}>
              {[
                { num: "20+", label: "Vetted professionals" },
                { num: "4",      label: "Service types" },
                { num: "100%", label: "Verified bookings" },
              ].map((s, i) => (
                <Box key={i} sx={{
                  flex: 1,
                  py: 2.5,
                  px: { xs: 0, sm: 0 },
                  pr: { xs: 1, sm: 4 },
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  mr: { xs: 1, sm: 4 },
                }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.1rem", sm: "1.8rem" }, fontWeight: 400, color: G.gold, lineHeight: 1 }}>
                    {s.num}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: { xs: "0.6rem", sm: "0.72rem" }, color: "rgba(255,255,255,0.35)", mt: 0.5, letterSpacing: "0.02em", lineHeight: 1.3 }}>
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
              display: cat.label === "All" ? { xs: "none", sm: "inline-flex" } : "inline-flex",
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
          ) : barbers.length === 0 ? (
            /* ── No businesses registered on the platform yet ── */
            <Box sx={{ textAlign: "center", py: { xs: 10, md: 14 } }}>
              <Box sx={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 72, height: 72, borderRadius: "50%",
                bgcolor: G.goldAlpha, border: `1px solid rgba(201,168,76,0.25)`, mb: 3,
              }}>
                <SearchIcon sx={{ fontSize: 30, color: G.gold, opacity: 0.7 }} />
              </Box>
              <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2rem" }, fontWeight: 400, color: G.dark, mb: 1.5 }}>
                No active listings yet
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", fontWeight: 300, color: G.muted, lineHeight: 1.8, maxWidth: 400, mx: "auto", mb: 4 }}>
                We're just getting started. Be the first professional to list your business and start taking bookings today.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate("/signup")}
                sx={{
                  bgcolor: G.gold, color: G.dark,
                  fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  px: 4, py: 1.5, borderRadius: "2px", boxShadow: "none",
                  "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
                }}
              >
                List your business
              </Button>
            </Box>
          ) : (
            <>
              {visibleSections.map(({ label, title, type }) => (
                <CategoryRow
                  key={type}
                  label={label}
                  title={title}
                  businessType={type}
                  businesses={filteredBarbers}
                  searchActive={!!(searchService || searchLocation)}
                />
              ))}

              {/* Empty state when search/filter returns nothing */}
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
      <Box sx={{
        bgcolor: G.dark, py: { xs: 12, md: 18 }, px: { xs: 2, md: 5 },
        position: "relative", overflow: "hidden",
        borderTop: `2px solid ${G.gold}`,
      }}>
        <Box sx={{ position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)", fontFamily: SERIF, fontSize: { xs: "16rem", md: "26rem" }, color: "rgba(201,168,76,0.03)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
          &amp;
        </Box>
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Box sx={{ textAlign: "center", mb: { xs: 8, md: 11 } }}>
            <SectionLabel text="For businesses" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, color: "#fff", mb: 2, lineHeight: 1.15, mt: 1 }}>
              Everything you need to <em style={{ fontStyle: "italic", color: G.gold }}>run your business</em>
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 500, mx: "auto" }}>
              Sign up and get your own professional website, booking system, payments, and more — all in one place.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 6, md: 8 }}>
            {PLATFORM_FEATURES.map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ color: G.gold }}>{f.icon}</Box>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.15rem", fontWeight: 400, color: "#fff" }}>
                    {f.title}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
                    {f.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: "center", mt: { xs: 8, md: 11 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" alignItems="center">
              <Button variant="contained" onClick={() => navigate("/signup")}
                sx={{ bgcolor: G.gold, color: G.dark, fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", px: 5, py: 1.8, borderRadius: "2px", boxShadow: "none", "&:hover": { bgcolor: G.goldLight, boxShadow: "none" } }}>
                Get listed for free
              </Button>
              <Button variant="outlined" onClick={() => setFeatureModalOpen(true)}
                sx={{ border: `2px solid ${G.gold}`, color: G.gold, fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", px: 5, py: 1.5, borderRadius: "2px", "&:hover": { borderColor: G.goldLight, color: G.goldLight, bgcolor: "rgba(201,168,76,0.08)" } }}>
                View features by type
              </Button>
            </Stack>
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
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <SectionLabel text="Testimonials" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Real bookings, real results
            </Typography>
          </Box>

          {/* Review card — all reviews stacked in one grid cell so the card
              height stays fixed to the tallest review (no page shift on change) */}
          <Paper elevation={0} sx={{
            p: { xs: 3, md: 5 }, bgcolor: G.warmWhite,
            border: `1px solid ${G.border}`, borderRadius: 0,
            display: "grid",
          }}>
            {REVIEWS.map((r, i) => (
              <Box key={i} sx={{
                gridArea: "1 / 1",
                opacity: i === revIdx ? 1 : 0,
                transition: "opacity 0.4s ease",
                pointerEvents: i === revIdx ? "auto" : "none",
              }}>
                <Stack direction="row" spacing={0.4} mb={2.5} justifyContent="center">
                  {[1,2,3,4,5].map(j => <StarIcon key={j} sx={{ color: G.gold, fontSize: { xs: 16, md: 18 } }} />)}
                </Stack>
                <Typography sx={{
                  fontFamily: ITALIC, fontStyle: "italic",
                  fontSize: { xs: "1.1rem", md: "1.3rem" },
                  color: G.dark2, lineHeight: 1.75, mb: 3, textAlign: "center",
                }}>
                  "{r.text}"
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                  <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: G.goldPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700, color: G.gold }}>{r.initials}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.85rem", color: G.dark }}>{r.name}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: G.muted }}>Booked: {r.trade}</Typography>
                  </Box>
                  <VerifiedIcon sx={{ color: G.gold, fontSize: 18, ml: 1 }} />
                </Stack>
              </Box>
            ))}
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

      {/* ── FEEDBACK SECTION ── */}
      <Box sx={{ bgcolor: G.warmWhite, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 }, borderTop: `1px solid ${G.border}` }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <SectionLabel text="Feature Request" />
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Missing a service type?
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", color: G.muted, mt: 2, maxWidth: 500, mx: "auto" }}>
              Let us know what business type or feature you'd like to see on yr-bookd. We read every suggestion.
            </Typography>
          </Box>

          <Paper elevation={0} sx={{
            p: { xs: 3, md: 4 }, bgcolor: "#fff",
            border: `1px solid ${G.border}`, borderRadius: 0,
          }}>
            {feedbackMessage && (
              <Alert severity={feedbackMessage.type} sx={{ mb: 2 }} onClose={() => setFeedbackMessage(null)}>
                {feedbackMessage.text}
              </Alert>
            )}

            <Box component="form" onSubmit={handleFeedbackSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Your name"
                    size="small"
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    disabled={feedbackSubmitting}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: G.border },
                        "&:hover fieldset": { borderColor: G.gold },
                        "&.Mui-focused fieldset": { borderColor: G.gold },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Your email"
                    type="email"
                    size="small"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    disabled={feedbackSubmitting}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: G.border },
                        "&:hover fieldset": { borderColor: G.gold },
                        "&.Mui-focused fieldset": { borderColor: G.gold },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Your suggestion"
                    multiline
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    disabled={feedbackSubmitting}
                    placeholder="E.g. 'I'd love to see a plumber marketplace' or 'Feature idea: custom booking duration options'"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: G.border },
                        "&:hover fieldset": { borderColor: G.gold },
                        "&.Mui-focused fieldset": { borderColor: G.gold },
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={feedbackSubmitting}
                startIcon={feedbackSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{
                  mt: 3,
                  py: 1.5,
                  bgcolor: G.gold,
                  color: G.dark,
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderRadius: "2px",
                  "&:hover": { bgcolor: G.goldLight },
                  "&.Mui-disabled": { bgcolor: "#d0d0d0", color: "#666" },
                }}
              >
                {feedbackSubmitting ? "Sending…" : "Send Feedback"}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{ bgcolor: G.dark, borderTop: `1px solid rgba(255,255,255,0.08)`, py: { xs: 5, md: 6 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="flex-start">

            {/* Brand */}
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", fontWeight: 400, color: G.gold, mb: 1 }}>
                yr-bookd
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, maxWidth: 260 }}>
                The UK's marketplace for vetted local professionals. Book online, pay securely, every time.
              </Typography>
            </Grid>

            {/* Platform links */}
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", mb: 2 }}>
                Platform
              </Typography>
              <Stack spacing={1.2}>
                {[
                  { label: "Browse services", action: () => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "List your business", action: () => navigate("/signup") },
                  { label: "Pricing", action: () => setPricingOpen(true) },
                ].map(link => (
                  <Typography
                    key={link.label}
                    onClick={link.action}
                    sx={{
                      fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)",
                      cursor: "pointer", transition: "color .2s",
                      "&:hover": { color: G.gold },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            {/* Account links */}
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", mb: 2 }}>
                Account
              </Typography>
              <Stack spacing={1.2}>
                {[
                  { label: "Log in", action: () => navigate("/login") },
                  { label: "Sign up", action: () => navigate("/signup") },
                ].map(link => (
                  <Typography
                    key={link.label}
                    onClick={link.action}
                    sx={{
                      fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)",
                      cursor: "pointer", transition: "color .2s",
                      "&:hover": { color: G.gold },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            {/* CTA */}
            <Grid item xs={12} md={4}>
              <Box sx={{
                p: 2.5, borderRadius: 2,
                border: "1px solid rgba(201,168,76,0.2)",
                bgcolor: "rgba(201,168,76,0.04)",
              }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.05rem", color: "#fff", mb: 0.75 }}>
                  Start your free trial
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", mb: 2, lineHeight: 1.7 }}>
                  30 days free, then £10-20/month depending on your business type. No card required.
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate("/signup")}
                    sx={{
                      bgcolor: G.gold, color: G.dark,
                      fontFamily: SANS, fontWeight: 700, fontSize: "0.75rem",
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      borderRadius: "2px", boxShadow: "none",
                      "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
                    }}
                  >
                    Get started
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setPricingOpen(true)}
                    sx={{
                      color: G.gold, fontFamily: SANS, fontWeight: 600,
                      fontSize: "0.75rem", letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      "&:hover": { bgcolor: "transparent", color: G.goldLight },
                    }}
                  >
                    See pricing →
                  </Button>
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {/* Bottom bar */}
          <Box sx={{ mt: 5, pt: 3, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>
              © {new Date().getFullYear()} yr-bookd. All rights reserved.
            </Typography>
            <Typography
              onClick={() => setPricingOpen(true)}
              sx={{
                fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)",
                cursor: "pointer", letterSpacing: "0.08em",
                "&:hover": { color: G.gold },
              }}
            >
              Pricing & Fees
            </Typography>
          </Box>
        </Container>
      </Box>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      <FeatureComparisonModal open={featureModalOpen} onClose={() => setFeatureModalOpen(false)} />

    </Box>
  );
}
