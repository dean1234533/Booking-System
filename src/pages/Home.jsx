import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Container, Typography, Grid, Paper,
  Skeleton, Button, Stack, Chip, InputBase, TextField, Alert,
  useMediaQuery, useTheme, IconButton, CircularProgress, Tooltip,
} from "@mui/material";
import SearchIcon             from "@mui/icons-material/Search";
import LocationOnIcon         from "@mui/icons-material/LocationOn";
import MyLocationIcon         from "@mui/icons-material/MyLocation";
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
import { Helmet }             from "react-helmet-async";
import CategoryRow            from "../components/CategoryRow";
import TenantHome             from "./TenantHome";
import PricingModal           from "../components/PricingModal";
import FeatureComparisonModal from "../components/FeatureComparisonModal";
import { useBarbers }         from "../hooks/useBarbers";
import { useNavigate, Link }  from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

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
  { name: "Jamie L.", initials: "JL", text: "I used to spend half my morning replying to 'are you free Saturday?' messages. Now clients book themselves in overnight and I wake up to a full diary. Couldn't go back.", trade: "Barber" },
  { name: "Priya S.", initials: "PS", text: "The deposit feature alone paid for the subscription in the first week. No more last-minute cancellations — if they've paid upfront, they show up.", trade: "Hairdresser" },
  { name: "Mark T.",  initials: "MT", text: "As a decorator I was quoting everything by hand and chasing invoices for weeks. Now I generate a quote, send the client a link, they approve it — done. Proper professional.", trade: "Decorator" },
  { name: "Chloe R.", initials: "CR", text: "My clients have their own portal where I upload their workout plans, check-in forms, and food diaries. It makes me look far more established than I am.", trade: "Personal Trainer" },
];

const FAQS = [
  { q: "Is Bookrightly really free to try?", a: "Yes — every plan includes a 90-day free trial with full access to booking, payments and your dashboard. No credit card is required to sign up." },
  { q: "What does it cost after the free trial?", a: "From £10–£20 a month depending on your business type, billed monthly with no long-term contract. You can see exact pricing for your industry during signup." },
  { q: "Can I cancel anytime?", a: "Yes. Subscriptions can be cancelled at any time from your dashboard — there's no minimum term and no cancellation fee." },
  { q: "Which industries does Bookrightly support?", a: "Barbers, hairdressers, decorators and personal trainers today, with new tools built for other service businesses on request — see the 'Don't see your industry?' section below." },
  { q: "Do I need any technical skills to set it up?", a: "No. Signing up gives you a fully branded booking website, online payments and a client dashboard — no coding or designer required." },
];

const PLATFORM_FEATURES = [
  { icon: <PublicIcon sx={{ fontSize: 26 }} />,            title: "Your own branded website",  body: "Every signup gets a fully branded booking site — logo, colours, services, photos, and social links. No coding, no designer, no monthly agency retainer." },
  { icon: <CalendarMonthIcon sx={{ fontSize: 26 }} />,     title: "Bookings that run themselves", body: "Clients pick a slot, book, and get an automatic confirmation and reminder. You never have to reply to 'are you free?' again." },
  { icon: <PaymentIcon sx={{ fontSize: 26 }} />,           title: "Online payments & deposits", body: "Connect Stripe in minutes. Take card payments, collect upfront deposits, and cut no-shows — without touching a bank transfer." },
  { icon: <InsertDriveFileIcon sx={{ fontSize: 26 }} />,   title: "Quotes & invoices",    body: "Generate professional quotes with a client-shareable link and send invoices — all from the same dashboard you take bookings in." },
  { icon: <CalendarMonthIcon sx={{ fontSize: 26 }} />,     title: "Outlook Calendar sync — zero double bookings", body: "Connect your Microsoft Outlook calendar and Bookrightly blocks any slot you're already busy for. Every confirmed booking goes straight into your calendar, and clients get an instant calendar invite for Google, Outlook, or Apple Calendar." },
  { icon: <InstagramIcon sx={{ fontSize: 26 }} />,         title: "Built for your trade — any trade", body: "Barbers, salons, PTs, and decorators are live now. Don't see your industry? Submit a request and we'll build it out. Bookrightly is designed to cover every service business, not just the four we started with." },
  { icon: <YouTubeIcon sx={{ fontSize: 26 }} />,           title: "One dashboard for everything", body: "Clients, bookings, money, your website, notifications — managed from one clean dashboard on your phone or computer." },
];

const HOW_STEPS = [
  { num: "01", title: "Sign up in 5 minutes",  body: "Choose your business type — barber, hairdresser, decorator, or personal trainer. Don't see yours? Request it from the homepage and we'll add it. Fill in your profile, upload a logo, and set your services and prices." },
  { num: "02", title: "Go live instantly",      body: "Your branded booking page is live the moment you finish setup. Share the link on Instagram, WhatsApp, in your bio — anywhere your clients already are." },
  { num: "03", title: "Clients book, you get paid", body: "Clients pick a time and pay online. You get a notification, they get a reminder. No phone tag, no no-shows, no chasing invoices." },
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
  const [locating,        setLocating]        = useState(false);
  const [revIdx,          setRevIdx]          = useState(0);
  const [pricingOpen,     setPricingOpen]     = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [feedbackName,    setFeedbackName]    = useState("");
  const [feedbackEmail,   setFeedbackEmail]   = useState("");
  const [feedbackText,    setFeedbackText]    = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);

  useEffect(() => {
    const tag = document.querySelector('meta[name="theme-color"]');
    if (tag) tag.setAttribute("content", "#C9A84C");
    return () => { if (tag) tag.setAttribute("content", "#0a0a0a"); };
  }, []);

  // Auto-advance reviews
  useEffect(() => {
    const t = setInterval(() => setRevIdx(i => (i + 1) % REVIEWS.length), 5000);
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
      await Promise.all([
        addDoc(collection(db, "platformFeedback"), {
          name:        feedbackName,
          email:       feedbackEmail,
          message:     feedbackText,
          submittedAt: serverTimestamp(),
        }),
        fetch("/api/send-feedback", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: feedbackName, email: feedbackEmail, message: feedbackText }),
        }),
      ]);
      setFeedbackMessage({ type: "success", text: "Thanks! Your feedback has been sent." });
      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackText("");
    } catch (err) {
      console.error("Feedback submission error:", err);
      setFeedbackMessage({ type: "error", text: "Something went wrong. Please try again." });
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
        b.city?.toLowerCase().includes(loc) ||
        b.area?.toLowerCase().includes(loc) ||
        b.borough?.toLowerCase().includes(loc) ||
        b.postcode?.toLowerCase().includes(loc);
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

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const area =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.town ||
            data.address?.city_district ||
            data.address?.city ||
            "";
          if (area) {
            setPendingLocation(area);
            setSearchLocation(area);
          }
        } catch {
          // silently ignore
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: SANS }}>
      <Helmet>
        <title>Bookrightly | Online Booking for Barbers & Salons</title>
        <meta
          name="description"
          content="Bookrightly gives barbers, hairdressers, decorators and personal trainers their own website, online booking, payments and business dashboard — all in one place."
        />
        <link rel="canonical" href="https://bookrightly.co.uk/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://bookrightly.co.uk/#organization",
                name: "Bookrightly",
                url: "https://bookrightly.co.uk",
                description: "The multi-industry appointment booking network for personal trainers, barbers, hairdressers, decorators, and more.",
                logo: "https://bookrightly.co.uk/images/IMG_9763-removebg-preview.png",
                email: "support@bookrightly.com",
              },
              {
                // Self-declares as a software product, not a physical local
                // business — Bookrightly is a UK-wide online platform with no
                // single premises, so a phone number/opening hours/map embed
                // genuinely don't apply the way they would for e.g. a barber
                // shop. This is the same signal Growth Audit itself looks for
                // to avoid penalising SaaS sites for lacking local-business
                // details they were never meant to have.
                "@type": "SoftwareApplication",
                "@id": "https://bookrightly.co.uk/#software",
                name: "Bookrightly",
                url: "https://bookrightly.co.uk",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                creator: { "@id": "https://bookrightly.co.uk/#organization" },
              },
              {
                // Generated directly from the FAQS array that renders the
                // actual visible FAQ section further down this page — the
                // schema can never drift out of sync with real page content.
                "@type": "FAQPage",
                mainEntity: FAQS.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              },
            ],
          })}
        </script>
      </Helmet>

      {/* ── HERO ── */}
      <Box sx={{
        bgcolor: G.dark,
        // Full-screen hero on every device. Use svh (small viewport height) — it
        // stays fixed while the mobile address bar hides/shows on scroll, so the
        // page doesn't jump. dvh would resize mid-scroll and cause jank.
        minHeight: "100vh",
        "@supports (min-height: 100svh)": { minHeight: "100svh" },
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
                Built for UK service professionals
              </Typography>
            </Box>

            {/* Title */}
            <Typography component="h1" sx={{
              fontFamily: SERIF, fontWeight: 400, color: "#fff",
              fontSize: { xs: "2.5rem", sm: "3.2rem", md: "4rem", lg: "4.8rem" },
              lineHeight: 1.08, letterSpacing: "-0.02em", mb: 2.5,
            }}>
              Stop managing bookings<br />
              <em style={{ fontStyle: "italic", color: G.gold }}> by hand.</em>
            </Typography>

            <Typography sx={{
              fontFamily: SANS, fontSize: { xs: "0.9rem", md: "1rem" }, fontWeight: 300,
              color: "rgba(255,255,255,0.55)", lineHeight: 1.8, maxWidth: 520, mb: 4,
            }}>
              Bookrightly gives barbers, hairdressers, decorators and personal trainers their own website, online booking, payments, and business dashboard — all in one place. Start your free 90-day trial today.
            </Typography>

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                onClick={() => navigate("/signup")}
                sx={{
                  bgcolor: G.gold, color: G.dark,
                  fontFamily: SANS, fontWeight: 700, fontSize: "0.85rem",
                  px: 3.5, py: 1.6, borderRadius: "2px", boxShadow: "none",
                  "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
                }}
              >
                Start free — 90 days on us
              </Button>
              <Button
                variant="outlined"
                onClick={() => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" })}
                sx={{
                  borderColor: "rgba(201,168,76,0.4)", color: G.goldLight,
                  fontFamily: SANS, fontWeight: 500, fontSize: "0.85rem",
                  px: 3.5, py: 1.6, borderRadius: "2px",
                  bgcolor: "rgba(201,168,76,0.06)",
                  "&:hover": { bgcolor: "rgba(201,168,76,0.12)", borderColor: G.gold },
                }}
              >
                Find a professional
              </Button>
            </Stack>
          </Box>
        </Container>

        {/* Stats bar — pinned to bottom of hero */}
        <Box sx={{ borderTop: `1px solid rgba(255,255,255,0.08)`, position: "relative", zIndex: 1 }}>
          <Container maxWidth="lg">
            <Stack direction="row" sx={{ flexWrap: "nowrap" }}>
              {[
                { num: "90",   label: "Day free trial — no card needed" },
                { num: "4",    label: "Business types supported" },
                { num: "£0",   label: "Setup cost. Ever." },
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
              display: "flex", alignItems: "center", gap: 1,
              border: `1.5px solid rgba(255,255,255,0.1)`, borderRadius: "2px",
              px: 2, height: 48, minWidth: { sm: 220 }, bgcolor: "rgba(255,255,255,0.04)",
              "&:focus-within": { borderColor: G.gold }, transition: "border-color .2s",
            }}>
              <LocationOnIcon sx={{ color: G.muted, fontSize: 18, flexShrink: 0 }} />
              <InputBase
                value={pendingLocation}
                onChange={e => setPendingLocation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Area, e.g. Stratford"
                sx={{ flex: 1, fontFamily: SANS, fontSize: "0.875rem", color: "#fff",
                  "& input::placeholder": { color: "rgba(255,255,255,0.3)" } }}
              />
              <Tooltip title="Use my location">
                <IconButton
                  size="small"
                  onClick={handleUseLocation}
                  disabled={locating}
                  sx={{ color: locating ? G.gold : G.muted, p: 0.5, flexShrink: 0,
                    "&:hover": { color: G.gold }, transition: "color .2s" }}
                >
                  {locating
                    ? <CircularProgress size={16} sx={{ color: G.gold }} />
                    : <MyLocationIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
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

      {/* ── WHY BOOKRIGHTLY ── */}
      <Box sx={{ bgcolor: G.cream, py: { xs: 10, md: 16 }, px: { xs: 2, md: 5 }, borderTop: `1px solid ${G.border}` }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: { xs: 6, md: 10 } }}>
            <SectionLabel text="Why Bookrightly" />
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, color: G.dark, lineHeight: 1.15, mt: 1, mb: 2 }}>
              Built for people who don't<br />
              <em style={{ fontStyle: "italic", color: G.gold }}>sit at a desk</em>
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", fontWeight: 300, color: G.muted, lineHeight: 1.8, maxWidth: 560, mx: "auto" }}>
              Whether you're cutting hair, painting walls, training clients, or running a salon — Bookrightly handles the business admin so you can focus on your craft.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {[
              {
                num: "01",
                title: "No more phone tag",
                body: "Clients book themselves in 24/7 through your own booking page. You wake up to a full diary — not a list of missed calls and WhatsApp messages to sort through.",
              },
              {
                num: "02",
                title: "Get paid without the awkward ask",
                body: "Connect Stripe and take deposits upfront. Card payments, no-shows blocked, invoices sent automatically. Your money arrives before the job does.",
              },
              {
                num: "03",
                title: "Look the part from day one",
                body: "Every account gets a fully branded website — logo, colours, services, portfolio, reviews, and social links. Looks like you spent thousands. Takes minutes.",
              },
              {
                num: "04",
                title: "Tools built for your actual job",
                body: "Decorators get quote generation and colour approval. Trainers get PAR-Q forms, food diaries, and workout plans. Barbers get staff profiles and live queue management. Don't see your industry? Request it — Bookrightly is built to cover every service business.",
              },
              {
                num: "05",
                title: "Invoices without the chase",
                body: "Send professional invoices straight from the same dashboard you take bookings in. Track what's paid and what's outstanding — no separate software, no spreadsheets.",
              },
              {
                num: "06",
                title: "Your calendar stays in sync — automatically",
                body: "Connect Outlook and Bookrightly checks your calendar before letting you open a slot. When someone books, it goes straight into your Outlook and the client gets a calendar invite for Google, Outlook, or Apple — no double bookings, ever.",
              },
              {
                num: "07",
                title: "90 days free, then straightforward pricing",
                body: "No card needed to start. Try everything free for 90 days. After that, it's £10–£20/month depending on your business type — less than one lost booking covers it.",
              },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box sx={{ p: 3.5, bgcolor: "#fff", border: `1px solid ${G.border}`, height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "2rem", fontWeight: 400, color: `rgba(201,168,76,0.5)`, lineHeight: 1 }}>
                    {item.num}
                  </Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", fontWeight: 400, color: G.dark }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.875rem", fontWeight: 300, color: G.muted, lineHeight: 1.8 }}>
                    {item.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: "center", mt: { xs: 6, md: 9 } }}>
            <Button variant="contained" onClick={() => navigate("/signup")}
              sx={{ bgcolor: G.dark, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", px: 5, py: 1.8, borderRadius: "2px", boxShadow: "none", "&:hover": { bgcolor: G.gold, color: G.dark, boxShadow: "none" } }}>
              Create your free account
            </Button>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: G.muted, mt: 1.5 }}>
              No credit card required. 90 days completely free. Cancel anytime.
            </Typography>
          </Box>
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
            <SectionLabel text="What's included" />
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, color: "#fff", mb: 2, lineHeight: 1.15, mt: 1 }}>
              Everything you need to <em style={{ fontStyle: "italic", color: G.gold }}>run your business</em>
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 500, mx: "auto" }}>
              One subscription. One login. Everything you need to run a professional service business in the UK.
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
                Start free — 90 days on us
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
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Live and taking bookings in under 10 minutes
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
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
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

      {/* ── FAQ ── */}
      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 }, borderTop: `1px solid ${G.border}` }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <SectionLabel text="FAQs" />
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Frequently asked questions
            </Typography>
          </Box>

          <Stack spacing={0}>
            {FAQS.map((item, i) => (
              <Box key={item.q} sx={{ py: 3, borderTop: i === 0 ? `1px solid ${G.border}` : "none", borderBottom: `1px solid ${G.border}` }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.05rem", color: G.dark, mb: 1 }}>
                  {item.q}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: G.muted, lineHeight: 1.75 }}>
                  {item.a}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── FEEDBACK SECTION ── */}
      <Box sx={{ bgcolor: G.warmWhite, py: { xs: 8, md: 12 }, px: { xs: 2, md: 5 }, borderTop: `1px solid ${G.border}` }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <SectionLabel text="Any Industry" />
            <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 400, color: G.dark, mt: 0.5 }}>
              Don't see your industry? Request it.
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", color: G.muted, mt: 2, maxWidth: 540, mx: "auto" }}>
              Bookrightly is built to work for any service business — not just the four we launched with. Tell us your business type and we'll build out the tools you need. Every request gets read.
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
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#888", textAlign: "center" }}>
                Your name and email are used only to follow up on your suggestion.{" "}
                <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
              </Typography>
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
                Bookrightly
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, maxWidth: 260 }}>
                The all-in-one platform for UK service professionals. Your own site, bookings, payments, and dashboard — one subscription, no tech needed.
              </Typography>
            </Grid>

            {/* Platform links — real <a href> (via react-router Link) for
                anything that goes to a real page, so search engines and
                accessibility tools can actually see/follow them; plain
                onClick only for in-page actions (scroll/modal) that aren't
                a distinct page to link to. */}
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", mb: 2 }}>
                Platform
              </Typography>
              <Stack spacing={1.2}>
                {[
                  { label: "Browse services", action: () => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "List your business", to: "/signup" },
                  { label: "Pricing", action: () => setPricingOpen(true) },
                  { label: "Contact us", to: "/contact" },
                ].map(link => (
                  <Typography
                    key={link.label}
                    component={link.to ? Link : "span"}
                    to={link.to}
                    onClick={link.action}
                    sx={{
                      fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)",
                      cursor: "pointer", transition: "color .2s", textDecoration: "none",
                      display: "block",
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
                  { label: "Log in", to: "/login" },
                  { label: "Sign up", to: "/signup" },
                ].map(link => (
                  <Typography
                    key={link.label}
                    component={Link}
                    to={link.to}
                    sx={{
                      fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)",
                      cursor: "pointer", transition: "color .2s", textDecoration: "none",
                      display: "block",
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
                  90 days free. No card needed.
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", mb: 2, lineHeight: 1.7 }}>
                  Try every feature free for 90 days, no credit card required. After that, from just £10/month — less than one missed booking. Cancel anytime from your dashboard.
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mt: 5, pt: 3, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}
          >
            <Stack spacing={0.5} alignItems={{ xs: "center", sm: "flex-start" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>
                © {new Date().getFullYear()} Bookrightly. All rights reserved.
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(255,255,255,0.15)" }}>
                Built by{" "}
                <a href="https://dean-da-dev.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                  Dean Da Dev
                </a>
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>
                <a href="mailto:support@bookrightly.com" style={{ color: "inherit", textDecoration: "none" }}>
                  support@bookrightly.com
                </a>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2.5} sx={{ flexWrap: "wrap", justifyContent: "center", rowGap: 1 }}>
              {[
                { label: "Terms & Conditions", to: "/terms" },
                { label: "Privacy Policy",     to: "/privacy" },
                { label: "Contact",            to: "/contact" },
                { label: "Pricing & Fees",     action: () => setPricingOpen(true) },
              ].map((l) => (
                <Typography
                  key={l.label}
                  component={l.to ? Link : "span"}
                  to={l.to}
                  onClick={l.action}
                  sx={{
                    fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)",
                    cursor: "pointer", letterSpacing: "0.08em", textDecoration: "none",
                    "&:hover": { color: G.gold },
                  }}
                >
                  {l.label}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      <FeatureComparisonModal open={featureModalOpen} onClose={() => setFeatureModalOpen(false)} />

    </Box>
  );
}
