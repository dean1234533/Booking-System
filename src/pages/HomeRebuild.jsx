import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, CircularProgress,
  Container, Grid, IconButton, InputBase, Paper, Stack, Typography,
} from "@mui/material";
import {
  ArrowForward as ArrowIcon, Brush as BrushIcon, CalendarMonth as CalendarIcon,
  Check as CheckIcon, ChevronLeft as LeftIcon, ChevronRight as RightIcon,
  ContentCut as CutIcon, ExpandMore as ExpandIcon, FitnessCenter as FitnessIcon,
  Language as WebsiteIcon, LocationOn as LocationIcon, MyLocation as LocateIcon,
  Payments as PaymentsIcon, People as PeopleIcon, Search as SearchIcon,
  Star as StarIcon, Storefront as StoreIcon, TrendingUp as GrowthIcon,
  Verified as VerifiedIcon, PhotoLibrary as GalleryIcon, WhatsApp as WhatsAppIcon,
  Groups as TeamIcon, Plumbing as PlumbingIcon, Lock as LockIcon,
} from "@mui/icons-material";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import BarberCard from "../components/BarberCard";
import { BrandMark } from "../components/Nav";
import { useBarbers } from "../hooks/useBarbers";
import { logFunnelEvent } from "../utils/funnelTracking";
import { geocodeAddress, distanceMiles, formatDistance } from "../utils/geocode";

const TenantHome = lazy(() => import("./TenantHome"));
const PricingModal = lazy(() => import("../components/PricingModal"));
const FeatureComparisonModal = lazy(() => import("../components/FeatureComparisonModal"));

const P = {
  ink: "#111116",
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  coral: "#FF735C",
  acid: "#93C5FD",
  paper: "#F5F3ED",
  white: "#FFFFFF",
  mist: "#EAF2FF",
  muted: "#696A73",
  line: "#DEDDD8",
};

const TRADES = [
  { key: "barber", label: "Barbers", icon: <CutIcon />, title: "A sharper way to run every chair.", copy: "Live queues, appointment history and staff schedules built into one fast workspace.", features: ["Walk-in queue", "Haircut history", "Chair scheduling"] },
  { key: "hairdresser", label: "Hair salons", icon: <CutIcon />, title: "A calmer salon starts here.", copy: "Keep services, deposits, bookings and client conversations together without losing the personal touch.", features: ["Service menus", "Deposits", "Team diaries"] },
  { key: "decorator", label: "Decorators", icon: <BrushIcon />, title: "Move every job from quote to paid.", copy: "Share professional quotes, capture colour approvals and keep the week organised from one screen.", features: ["Digital quotes", "Colour approvals", "Job invoices"] },
  { key: "trainer", label: "Personal trainers", icon: <FitnessIcon />, title: "Run the admin. Keep the coaching human.", copy: "Sessions, client records, plans, check-ins and food diaries—all connected around each client.", features: ["Client portal", "Workout plans", "Check-ins"] },
  { key: "plumber", label: "Plumbing & heating", icon: <PlumbingIcon />, title: "From first call to paid job.", copy: "Keep enquiries, site visits, quotes, job planning and invoices moving without losing the details.", features: ["Job enquiries", "Trade quotes", "Day planner"] },
];

const UPDATES = [
  { icon: <TeamIcon />, title: "Every team member gets their own page", copy: "Add staff from your dashboard and each person gets a branded page with their own gallery, reviews and socials — promoting your team, not just your business." },
  { icon: <GalleryIcon />, title: "Before & after galleries", copy: "Show off real results with a drag-to-reveal gallery on every trade's page, plus your own upload tools in the dashboard." },
  { icon: <WhatsAppIcon />, title: "Book via WhatsApp", copy: "Give clients who'd rather message than fill out a form a quick way to enquire, right next to your normal booking flow." },
];

const BENEFITS = [
  { icon: <CalendarIcon />, kicker: "Bookings", title: "A diary that fills itself", copy: "Clients choose, pay and receive confirmations without waiting for a reply." },
  { icon: <WebsiteIcon />, kicker: "Website", title: "Your best work, ready to book", copy: "A polished public page with services, reviews and live availability." },
  { icon: <PaymentsIcon />, kicker: "Money", title: "Deposits without the chase", copy: "Take payments and send invoices from the same place you manage the work." },
  { icon: <PeopleIcon />, kicker: "Clients", title: "Every detail remembered", copy: "Notes, preferences and history stay attached to the right person." },
  { icon: <GrowthIcon />, kicker: "Insights", title: "Know what is working", copy: "See demand, revenue and open capacity without building a spreadsheet." },
];

const STEPS = [
  ["01", "Choose your trade", "Your workspace is shaped around how your kind of business actually operates."],
  ["02", "Make it yours", "Add your brand, services, prices and working hours in a few focused steps."],
  ["03", "Share one link", "Your booking page goes live and new appointments arrive in your dashboard."],
];

const STEP_PALETTES = [
  { background: "#171B3D", number: "#93C5FD" },
  { background: "#D95B47", number: "#FFE4DE" },
  { background: "#2563EB", number: "#EAF2FF" },
];

const REVIEWS = [
  ["Mpower Electrical and Building Services", "Plumber", "Excellent and easy to use. Bookrightly.co.uk provided me with a refreshingly clean, intuitive and highly functional service and cuts out clutter, allowing me to build a sleek, client-facing booking profile within minutes."],
];
const GOOGLE_REVIEW_URL = "https://maps.app.goo.gl/qg92kGm8YdDQ17hs8?g_st=iw";

const FAQS = [
  ["Is the 90-day trial really free?", "Yes. You get full access for 90 days and do not need to enter card details."],
  ["Do I get my own website?", "Yes. Your account includes a branded public page with services, photos, reviews and online booking."],
  ["Can clients pay online?", "Yes. Connect Stripe to take deposits and payments and help reduce no-shows."],
  ["Can I use it on my phone?", "Yes. The dashboard is mobile-friendly and can be installed on supported devices."],
];

function Label({ children, light = false }) {
  return <Typography sx={{ color: light ? P.acid : P.blue, fontWeight: 950, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase" }}>{children}</Typography>;
}

function WorkspaceVisual() {
  const slots = [["09:30", "Alex Morgan", "Consultation"], ["12:00", "Sam Taylor", "Signature service"], ["15:30", "Jordan Lee", "Follow-up"]];
  return (
    <Box sx={{ position: "relative", minHeight: { xs: "auto", md: 560 }, display: { xs: "flex", md: "grid" }, flexDirection: { xs: "column", md: "initial" }, placeItems: { md: "center" }, gap: { xs: 1.4, md: 0 }, pt: { xs: 1, md: 0 } }}>
      <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", width: "78%", height: "75%", borderRadius: "50%", bgcolor: P.mist, filter: "blur(2px)" }} />
      <Paper sx={{ order: { xs: 2, md: "initial" }, position: "relative", width: { xs: "100%", sm: "82%" }, bgcolor: P.ink, color: "#fff", p: { xs: 2, sm: 2.5 }, borderRadius: { xs: 4, md: 5 }, transform: { xs: "none", md: "rotate(-3deg)" }, boxShadow: { xs: "0 22px 55px rgba(17,17,22,.2)", md: "0 38px 80px rgba(17,17,22,.28)" }, border: "1px solid rgba(255,255,255,.12)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 950, fontSize: ".82rem" }}>Today</Typography>
          <Chip label="4 bookings" size="small" sx={{ bgcolor: P.acid, color: P.ink, fontWeight: 900 }} />
        </Stack>
        <Typography sx={{ color: "rgba(255,255,255,.46)", fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".1em" }}>Monday, 17 August</Typography>
        <Typography sx={{ fontWeight: 950, fontSize: { xs: "1.6rem", sm: "2rem" }, letterSpacing: "-.04em", mt: .6 }}>Good morning, Jamie.</Typography>
        <Stack spacing={1} sx={{ mt: 3 }}>
          {slots.map((slot, index) => (
            <Box key={slot[0]} sx={{ display: "grid", gridTemplateColumns: "55px 1fr auto", gap: 1.2, alignItems: "center", p: 1.35, borderRadius: 2.5, bgcolor: index === 0 ? P.blue : "rgba(255,255,255,.06)" }}>
              <Typography sx={{ color: "#fff", fontSize: { xs: ".92rem", md: ".9rem" }, fontWeight: 950 }}>{slot[0]}</Typography>
              <Box><Typography sx={{ fontSize: ".7rem", fontWeight: 900 }}>{slot[1]}</Typography><Typography sx={{ color: "rgba(255,255,255,.45)", fontSize: ".55rem" }}>{slot[2]}</Typography></Box>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: index === 0 ? P.acid : P.coral }} />
            </Box>
          ))}
        </Stack>
      </Paper>
      <Paper sx={{ order: { xs: 1, md: "initial" }, position: { xs: "relative", md: "absolute" }, top: { md: 55 }, right: { md: -10 }, width: { xs: "100%", md: "auto" }, p: { xs: 1.5, md: 1.7 }, borderRadius: 3, transform: { xs: "none", md: "rotate(5deg)" }, boxShadow: { xs: "none", md: "0 18px 45px rgba(17,17,22,.16)" }, border: { xs: `1px solid ${P.line}`, md: "none" }, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ color: P.muted, fontSize: ".6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>This week</Typography>
        <Typography sx={{ fontSize: { xs: "1.1rem", md: "1.3rem" }, fontWeight: 950, color: P.blue }}>£1,240</Typography>
      </Paper>
      <Paper sx={{ order: { xs: 3, md: "initial" }, position: { xs: "relative", md: "absolute" }, bottom: { md: 45 }, left: { md: -10 }, width: { xs: "100%", md: "auto" }, p: { xs: 1.4, md: 1.6 }, borderRadius: 3, bgcolor: P.acid, transform: { xs: "none", md: "rotate(-4deg)" }, boxShadow: { xs: "none", md: "0 18px 45px rgba(17,17,22,.14)" }, textAlign: { xs: "center", md: "left" } }}>
        <Typography sx={{ fontSize: ".72rem", fontWeight: 950 }}>New booking received ✓</Typography>
      </Paper>
    </Box>
  );
}

function MovingRail({ items, renderItem, duration = 80, stackMobile = false, label }) {
  return (
    <Box role="region" aria-label={label} sx={{ overflow: stackMobile ? { xs: "visible", sm: "hidden" } : "hidden", mx: stackMobile ? 0 : { xs: -2, sm: 0 }, px: stackMobile ? 0 : { xs: 2, sm: 0 }, py: 3, maskImage: stackMobile ? { xs: "none", sm: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)" } : "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)" }}>
      <Box sx={{ display: stackMobile ? { xs: "block", sm: "flex" } : "flex", width: stackMobile ? { xs: "100%", sm: "max-content" } : "max-content", gap: 2.5, animation: stackMobile ? { xs: "none", sm: `rebuildRail ${duration}s linear infinite` } : `rebuildRail ${duration}s linear infinite`, "@keyframes rebuildRail": { from: { transform: "translateX(0)" }, to: { transform: "translateX(calc(-50% - 10px))" } } }}>
        {[0, 1].map(group => (
          <Box key={group} aria-hidden={group ? "true" : undefined} sx={{ display: stackMobile ? { xs: group ? "none" : "block", sm: "flex" } : "flex", gap: 2.5, flexShrink: 0 }}>
            {items.map((item, index) => (
              <Box key={item.title || item[0] || index} sx={{ width: stackMobile ? { xs: "100%", sm: 340 } : { xs: 285, sm: 340 }, flexShrink: 0, mb: stackMobile ? { xs: 1.5, sm: 0 } : 0, transform: { sm: `perspective(900px) rotateY(${index % 2 ? "3deg" : "-3deg"})` }, filter: { sm: "drop-shadow(0 18px 16px rgba(17,17,22,.12))" } }}>{renderItem(item)}</Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ReviewCarousel() {
  const [review, setReview] = useState(0);
  const current = REVIEWS[review];
  const go = direction => setReview(value => (value + direction + REVIEWS.length) % REVIEWS.length);
  return (
    <Box>
      {REVIEWS.length > 1 && (
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
          <IconButton aria-label="Previous review" onClick={() => go(-1)} sx={{ border: "1px solid rgba(255,255,255,.2)", color: "#fff" }}><LeftIcon /></IconButton>
          <IconButton aria-label="Next review" onClick={() => go(1)} sx={{ bgcolor: P.acid, color: P.ink, "&:hover": { bgcolor: "#e4fb88" } }}><RightIcon /></IconButton>
        </Stack>
      )}
      <Box key={review} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "180px 1fr" }, minHeight: { xs: 390, md: 330 }, border: "1px solid rgba(255,255,255,.14)", borderRadius: 5, overflow: "hidden", animation: "reviewIn .45s ease both", "@keyframes reviewIn": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
        <Box sx={{ bgcolor: P.blue, p: 3, display: "flex", flexDirection: "column", gap: 1, justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography sx={{ fontSize: "3.5rem", fontWeight: 950, letterSpacing: "-.08em" }}>0{review + 1}</Typography>
          <Box><Typography sx={{ fontWeight: 950 }}>{current[0]}</Typography><Stack direction="row" alignItems="center" spacing={.5}><VerifiedIcon sx={{ color: P.acid, fontSize: 15 }} /><Typography sx={{ color: "rgba(255,255,255,.6)", fontSize: ".7rem" }}>{current[1]}</Typography></Stack></Box>
        </Box>
        <Box sx={{ p: { xs: 3.5, sm: 5, md: 6 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Stack direction="row" spacing={.25}>{[1,2,3,4,5].map(star => <StarIcon key={star} sx={{ color: P.acid, fontSize: 18 }} />)}</Stack>
          <Typography component="blockquote" sx={{ m: 0, mt: 2.5, fontSize: { xs: "1.45rem", sm: "1.85rem", md: "2.15rem" }, fontWeight: 850, lineHeight: 1.3, letterSpacing: "-.045em" }}>“{current[2]}”</Typography>
          <Typography
            component="a"
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 2.5, fontSize: ".78rem", fontWeight: 800, color: P.blue, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            See this review on Google →
          </Typography>
        </Box>
      </Box>
      {REVIEWS.length > 1 && (
        <Stack direction="row" spacing={.7} justifyContent="center" sx={{ mt: 2 }}>{REVIEWS.map((item, index) => <Box component="button" aria-label={`Show review ${index + 1}`} key={item[0]} onClick={() => setReview(index)} sx={{ border: 0, p: 0, width: review === index ? 25 : 7, height: 7, borderRadius: 5, bgcolor: review === index ? P.acid : "rgba(255,255,255,.22)", cursor: "pointer" }} />)}</Stack>
      )}
    </Box>
  );
}

function HomeRebuild({ tenant }) {
  const navigate = useNavigate();
  const { barbers, loading } = useBarbers();
  const [trade, setTrade] = useState("barber");
  const [pricingOpen] = useState(false);
  const setPricingOpen = (nextOpen) => { if (nextOpen) navigate("/pricing"); };
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [draftService, setDraftService] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [locating, setLocating] = useState(false);
  const [myCoords, setMyCoords] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);
  useEffect(() => { if (!tenant) logFunnelEvent("home_view"); }, [tenant]);
  if (tenant) return <Suspense fallback={null}><TenantHome tenant={tenant} /></Suspense>;

  const activeTrade = TRADES.find(item => item.key === trade) || TRADES[0];
  const businesses = useMemo(() => {
    const service = searchService.toLowerCase().trim();
    const location = searchLocation.toLowerCase().trim();
    const filtered = barbers.filter(item => {
      const type = item.businessType || "barber";
      return (category === "all" || type === category)
        && (!service || [item.businessName, item.displayName, item.specialty, item.aboutUs, type].some(value => value?.toLowerCase().includes(service)))
        && (!location || myCoords || [item.address, item.city, item.area, item.borough, item.postcode].some(value => value?.toLowerCase().includes(location)));
    });

    if (!myCoords) return filtered;

    // With real coordinates for the searched location, rank by actual
    // distance instead of leaving order to whatever Firestore returned.
    // Businesses without their own geocoded coordinates (not yet saved
    // through an address that geocoded successfully) sort to the end rather
    // than being dropped — still discoverable, just not distance-ranked.
    const withDistance = filtered.map(item => {
      const hasCoords = typeof item.latitude === "number" && typeof item.longitude === "number";
      const miles = hasCoords ? distanceMiles(myCoords.latitude, myCoords.longitude, item.latitude, item.longitude) : null;
      return { ...item, distanceMiles: miles, distanceLabel: miles != null ? formatDistance(miles) : null };
    });
    withDistance.sort((a, b) => {
      if (a.distanceMiles == null && b.distanceMiles == null) return 0;
      if (a.distanceMiles == null) return 1;
      if (b.distanceMiles == null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });
    return withDistance;
  }, [barbers, category, searchLocation, searchService, myCoords]);
  const realBusinesses = businesses.filter(item => !item.isDemo);
  const demoBusinesses = businesses.filter(item => item.isDemo);

  const search = async () => {
    setSearchService(draftService);
    setSearchLocation(draftLocation);
    if (!draftLocation.trim()) { setMyCoords(null); return; }
    setLocating(true);
    const coords = await geocodeAddress(`${draftLocation}, UK`);
    setMyCoords(coords);
    setLocating(false);
  };
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setMyCoords({ latitude: coords.latitude, longitude: coords.longitude });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { "Accept-Language": "en" } });
        const data = await response.json();
        const area = data.address?.suburb || data.address?.town || data.address?.city || "";
        if (area) { setDraftLocation(area); setSearchLocation(area); }
      } catch { /* Reverse geocoding is just for the search-box label — coords are already set. */ } finally { setLocating(false); }
    }, () => setLocating(false), { timeout: 8000 });
  };

  return (
    <Box sx={{ bgcolor: P.paper, color: P.ink, overflowX: "hidden", "& > footer": { display: "none" } }}>
      <Helmet>
        <title>Bookrightly | Business, Beautifully Run</title>
        <meta name="description" content="Websites, bookings, clients and payments in one workspace built for UK service professionals. Start free for 90 days." />
        <link rel="canonical" href="https://bookrightly.co.uk/" />
      </Helmet>

      <Box sx={{ position: "relative", bgcolor: P.paper, overflow: "hidden" }}>
        <Box sx={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", bgcolor: P.mist, top: -420, left: "42%" }} />
        <Container maxWidth="xl" sx={{ position: "relative", pt: { xs: 14, md: 16 }, pb: { xs: 7, md: 9 }, px: { xs: 2, md: 5 } }}>
          <Grid container spacing={{ xs: 4, md: 7 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Label>Business software without the busywork</Label>
              <Typography component="h1" sx={{ mt: 1.5, fontSize: { xs: "3.2rem", sm: "4.8rem", lg: "6rem" }, fontWeight: 950, letterSpacing: "-.08em", lineHeight: .88, maxWidth: 760 }}>More time doing.<Box component="span" sx={{ color: P.blue, display: "block" }}>Less organising.</Box></Typography>
              <Typography sx={{ mt: 3, maxWidth: 560, color: P.muted, fontSize: { xs: ".96rem", md: "1.08rem" }, lineHeight: 1.75 }}>Bookrightly puts your website, diary, clients and payments into one workspace made for the way you earn.</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mt: 3.5 }}>
                <Button variant="contained" onClick={() => { logFunnelEvent("home_cta_clicked", { location: "hero" }); navigate("/signup"); }} endIcon={<ArrowIcon />} sx={{ bgcolor: P.blue, color: "#fff", borderRadius: 99, minHeight: 56, px: 3.2, fontWeight: 950, "&:hover": { bgcolor: P.blueDark } }}>Start 90 days free</Button>
                <Button onClick={() => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" })} sx={{ border: "1px solid " + P.line, color: P.ink, bgcolor: "#fff", borderRadius: 99, minHeight: 56, px: 3 }}>Find a professional</Button>
              </Stack>
              <Stack direction="row" spacing={2.5} sx={{ mt: 3, flexWrap: "wrap", rowGap: 1 }}>{["No card", "Ready in minutes", "Cancel anytime"].map(item => <Stack key={item} direction="row" spacing={.5} alignItems="center"><CheckIcon sx={{ color: P.blue, fontSize: 16 }} /><Typography sx={{ color: P.muted, fontSize: ".7rem", fontWeight: 800 }}>{item}</Typography></Stack>)}</Stack>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 2, display: "inline-flex", bgcolor: "#fff", border: "1px solid " + P.line, borderRadius: 99, pl: 2, pr: 1.8, py: 1 }}>
                <LockIcon sx={{ color: P.blue, fontSize: 19 }} />
                <Typography sx={{ color: P.ink, fontSize: ".92rem", fontWeight: 800 }}>Secure payments —</Typography>
                <Box component="img" src="/images/stripe/powered-by-stripe-blurple.svg" alt="Powered by Stripe" sx={{ height: 18, display: "block" }} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}><WorkspaceVisual /></Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: P.ink, color: "#fff", py: 2.3, overflow: "hidden" }}>
        <Stack direction="row" justifyContent="space-around" spacing={4} sx={{ minWidth: 700, px: 2 }}>{[["90 days", "free"], ["5 trades", "purpose-built"], ["£0", "setup"], ["24/7", "booking"]].map(item => <Stack key={item[0]} direction="row" spacing={1} alignItems="baseline"><Typography sx={{ color: P.acid, fontSize: "1.3rem", fontWeight: 950 }}>{item[0]}</Typography><Typography sx={{ color: "rgba(255,255,255,.45)", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".08em" }}>{item[1]}</Typography></Stack>)}</Stack>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Chip label="Just shipped" size="small" sx={{ bgcolor: P.mist, color: P.blue, fontWeight: 950, fontSize: ".66rem" }} />
            <Typography sx={{ color: P.muted, fontSize: ".78rem" }}>Recently added to Bookrightly</Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {UPDATES.map(item => (
              <Grid item xs={12} sm={4} key={item.title}>
                <Paper sx={{ height: "100%", p: 3, borderRadius: 4, border: "1px solid " + P.line, boxShadow: "none" }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: P.mist, color: P.blue, display: "grid", placeItems: "center" }}>{item.icon}</Box>
                  <Typography sx={{ mt: 2, fontSize: "1.02rem", fontWeight: 950, letterSpacing: "-.02em" }}>{item.title}</Typography>
                  <Typography sx={{ mt: 1, color: P.muted, fontSize: ".82rem", lineHeight: 1.65 }}>{item.copy}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 13 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 3, md: 7 }} alignItems="end" sx={{ mb: 4 }}><Grid item xs={12} md={7}><Label>Built differently for every trade</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.3rem", md: "4rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: .98 }}>Generic software makes you adapt.<br />This adapts to you.</Typography></Grid><Grid item xs={12} md={5}><Typography sx={{ color: P.muted, lineHeight: 1.75 }}>Choose your business type and Bookrightly brings forward the exact tools your working day needs.</Typography></Grid></Grid>
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 2, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>{TRADES.map(item => <Button key={item.key} onClick={() => setTrade(item.key)} startIcon={item.icon} sx={{ flexShrink: 0, borderRadius: 99, px: 2.2, py: 1.2, bgcolor: trade === item.key ? P.ink : P.paper, color: trade === item.key ? "#fff" : P.muted, fontWeight: 900, "&:hover": { bgcolor: trade === item.key ? P.ink : P.mist } }}>{item.label}</Button>)}</Stack>
          <Box sx={{ mt: 1, bgcolor: P.blue, color: "#fff", borderRadius: { xs: 4, md: 6 }, p: { xs: 3, sm: 5, md: 7 }, position: "relative", overflow: "hidden" }}>
            <Typography aria-hidden="true" sx={{ position: "absolute", right: -20, bottom: -95, fontSize: { xs: "12rem", md: "22rem" }, fontWeight: 950, lineHeight: 1, color: "rgba(255,255,255,.07)" }}>0{TRADES.findIndex(item => item.key === trade) + 1}</Typography>
            <Grid container spacing={5} alignItems="center" sx={{ position: "relative" }}><Grid item xs={12} md={7}><Box sx={{ width: 58, height: 58, borderRadius: 3, bgcolor: P.acid, color: P.ink, display: "grid", placeItems: "center", mb: 3 }}>{activeTrade.icon}</Box><Typography sx={{ fontSize: { xs: "2rem", md: "3.4rem" }, fontWeight: 950, letterSpacing: "-.06em", lineHeight: 1 }}>{activeTrade.title}</Typography><Typography sx={{ mt: 2, maxWidth: 620, color: "rgba(255,255,255,.68)", lineHeight: 1.75 }}>{activeTrade.copy}</Typography></Grid><Grid item xs={12} md={5}><Stack spacing={1}>{activeTrade.features.map(feature => <Box key={feature} sx={{ p: 1.6, border: "1px solid rgba(255,255,255,.18)", borderRadius: 2.5, bgcolor: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 1 }}><CheckIcon sx={{ color: P.acid, fontSize: 18 }} /><Typography sx={{ fontWeight: 850, fontSize: ".82rem" }}>{feature}</Typography></Box>)}</Stack><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}><Button variant="contained" onClick={() => { logFunnelEvent("home_cta_clicked", { location: "trade_tab", trade }); navigate("/signup"); }} sx={{ bgcolor: P.acid, color: P.ink, borderRadius: 99, fontWeight: 950, "&:hover": { bgcolor: "#BFDBFE" } }}>Start for this trade</Button><Button onClick={() => setFeaturesOpen(true)} sx={{ color: "#fff" }}>Compare features</Button></Stack></Grid></Grid>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: P.paper, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg"><Box sx={{ maxWidth: 720, mb: 2 }}><Label>One login. Every moving part.</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.3rem", md: "3.7rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>Your day, connected end to end.</Typography></Box><MovingRail label="connected business tools" items={BENEFITS} renderItem={item => <Paper sx={{ height: 240, p: 3.2, borderRadius: 4, border: "1px solid " + P.line, boxShadow: "none" }}><Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: P.mist, color: P.blue, display: "grid", placeItems: "center" }}>{item.icon}</Box><Typography sx={{ mt: 2.2, color: P.blue, fontSize: ".64rem", fontWeight: 950, textTransform: "uppercase", letterSpacing: ".1em" }}>{item.kicker}</Typography><Typography sx={{ mt: .6, fontSize: "1.05rem", fontWeight: 950 }}>{item.title}</Typography><Typography sx={{ mt: 1, color: P.muted, fontSize: ".8rem", lineHeight: 1.65 }}>{item.copy}</Typography></Paper>} /></Container>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: { md: "flex" }, alignItems: "end", justifyContent: "space-between", gap: 4, mb: { xs: 4, md: 6 } }}>
            <Box sx={{ maxWidth: 720 }}>
              <Label>From signup to live</Label>
              <Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.3rem", md: "3.7rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>Open for bookings before your next client.</Typography>
            </Box>
            <Typography sx={{ mt: { xs: 2, md: 0 }, maxWidth: 330, color: P.muted, lineHeight: 1.7 }}>No coding. No agency. No complicated setup project.</Typography>
          </Box>

          <Grid container spacing={2.5} role="region" aria-label="setup steps">
            {STEPS.map((step, index) => {
              const palette = STEP_PALETTES[index];
              return (
                <Grid item xs={12} sm={4} key={step[0]}>
                  <Paper sx={{ height: "100%", minHeight: { xs: 210, sm: 280 }, p: { xs: 3.2, sm: 2.5, md: 4 }, borderRadius: "28px 28px 28px 8px", bgcolor: palette.background, color: "#fff", boxShadow: "none", display: "flex", flexDirection: "column" }}>
                    <Typography sx={{ color: palette.number, fontWeight: 950, fontSize: "2rem", letterSpacing: "-.05em" }}>{step[0]}</Typography>
                    <Box sx={{ mt: "auto", pt: 5 }}>
                      <Typography sx={{ fontWeight: 950, fontSize: "1.35rem", letterSpacing: "-.025em" }}>{step[1]}</Typography>
                      <Typography sx={{ mt: 1, color: "rgba(255,255,255,.7)", fontSize: ".83rem", lineHeight: 1.7 }}>{step[2]}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: P.ink, color: "#fff", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg"><Box sx={{ maxWidth: 700 }}><Label light>Real working days</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.3rem", md: "3.8rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>The admin changed.<br />The craft stayed yours.</Typography></Box><Box sx={{ mt: 3 }}><ReviewCarousel /></Box></Container>
      </Box>

      <Box sx={{ bgcolor: P.paper, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg"><Grid container spacing={{ xs: 4, md: 7 }}><Grid item xs={12} md={5}><Label>Simple by design</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.4rem", md: "3.8rem" }, fontWeight: 950, letterSpacing: "-.07em", lineHeight: 1 }}>One price.<br />A full working system.</Typography><Typography sx={{ mt: 2, color: P.muted, maxWidth: 430, lineHeight: 1.75 }}>Start with every feature for 90 days. Keep going from £10 a month.</Typography><Button onClick={() => setPricingOpen(true)} endIcon={<ArrowIcon />} sx={{ mt: 2, p: 0, color: P.blue, fontWeight: 950 }}>See pricing by trade</Button></Grid><Grid item xs={12} md={7}><Paper sx={{ bgcolor: P.blue, color: "#fff", p: { xs: 3.5, sm: 5 }, borderRadius: 5, position: "relative", overflow: "hidden", boxShadow: "0 30px 70px rgba(37,99,235,.22)" }}><Box sx={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", bgcolor: "rgba(147,197,253,.12)", right: -70, top: -120 }} /><Typography sx={{ color: P.acid, fontSize: ".68rem", fontWeight: 950, textTransform: "uppercase", letterSpacing: ".12em" }}>Everything included</Typography><Typography sx={{ mt: 1, fontSize: "4rem", fontWeight: 950, letterSpacing: "-.08em" }}>£10<Box component="span" sx={{ fontSize: ".8rem", color: "rgba(255,255,255,.55)", letterSpacing: 0 }}>/month</Box></Typography><Stack spacing={1.1} sx={{ mt: 2 }}>{["Your branded booking website", "Clients, payments and invoices", "Tools shaped around your trade"].map(item => <Stack key={item} direction="row" spacing={1} alignItems="center"><Box sx={{ width: 21, height: 21, borderRadius: "50%", bgcolor: P.acid, color: P.ink, display: "grid", placeItems: "center" }}><CheckIcon sx={{ fontSize: 14 }} /></Box><Typography sx={{ color: "rgba(255,255,255,.8)", fontSize: ".82rem" }}>{item}</Typography></Stack>)}</Stack><Button fullWidth variant="contained" onClick={() => { logFunnelEvent("home_cta_clicked", { location: "pricing_section" }); navigate("/signup"); }} sx={{ mt: 3.5, bgcolor: P.acid, color: P.ink, borderRadius: 99, minHeight: 52, fontWeight: 950, "&:hover": { bgcolor: "#BFDBFE" } }}>Start free today</Button></Paper></Grid></Grid></Container>
      </Box>

      <Box id="browse-section" sx={{ bgcolor: "#fff", py: { xs: 8, md: 12 }, scrollMarginTop: 80 }}>
        <Container maxWidth="lg"><Grid container spacing={3} alignItems="end" sx={{ mb: 4 }}><Grid item xs={12} md={5}><Label>For customers</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.3rem", md: "3.5rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>Find someone brilliant nearby.</Typography></Grid><Grid item xs={12} md={7}><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Paper sx={{ flex: 1, display: "flex", alignItems: "center", px: 1.5, minHeight: 52, bgcolor: P.paper, borderRadius: 99, boxShadow: "none" }}><SearchIcon sx={{ color: P.muted, mr: 1 }} /><InputBase fullWidth placeholder="Service or business" value={draftService} onChange={event => setDraftService(event.target.value)} onKeyDown={event => event.key === "Enter" && search()} /></Paper><Paper sx={{ flex: 1, display: "flex", alignItems: "center", px: 1.5, minHeight: 52, bgcolor: P.paper, borderRadius: 99, boxShadow: "none" }}><LocationIcon sx={{ color: P.muted, mr: 1 }} /><InputBase fullWidth placeholder="Town or area" value={draftLocation} onChange={event => setDraftLocation(event.target.value)} onKeyDown={event => event.key === "Enter" && search()} /><IconButton aria-label="Use my location" onClick={locate}>{locating ? <CircularProgress size={17} /> : <LocateIcon />}</IconButton></Paper><Button variant="contained" onClick={search} sx={{ bgcolor: P.ink, color: "#fff", borderRadius: 99, px: 3, "&:hover": { bgcolor: P.blue } }}>Search</Button></Stack></Grid></Grid>
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 2 }}>{[["all", "All"], ...TRADES.map(item => [item.key, item.label])].map(item => <Chip key={item[0]} label={item[1]} onClick={() => setCategory(item[0])} sx={{ flexShrink: 0, bgcolor: category === item[0] ? P.blue : P.paper, color: category === item[0] ? "#fff" : P.ink, fontWeight: 900 }} />)}</Stack>
          {loading ? <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress sx={{ color: P.blue }} /></Box> : businesses.length ? <Stack spacing={5}>
            {realBusinesses.length > 0 && <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22A06B" }} /><Typography sx={{ fontWeight: 950 }}>Businesses near you</Typography><Chip label="Live" size="small" sx={{ height: 22, bgcolor: "#E6F6EF", color: "#147A52", fontWeight: 900, fontSize: ".62rem" }} /></Stack>
              <Box sx={{ display: "flex", gap: 2.5, overflowX: "auto", pb: 2, scrollSnapType: "x mandatory", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>{realBusinesses.slice(0, 8).map(item => <Box key={item.id || item.uid} sx={{ flex: "0 0 auto", width: { xs: "86%", sm: "48%", md: "32%" }, scrollSnapAlign: "start" }}><BarberCard barber={item} isMarketplace /></Box>)}</Box>
            </Box>}
            {demoBusinesses.length > 0 && <Box sx={{ pt: realBusinesses.length ? 1 : 0, borderTop: realBusinesses.length ? `1px solid ${P.line}` : "none" }}>
              <Box sx={{ mb: 2 }}><Stack direction="row" alignItems="center" spacing={1}><Typography sx={{ fontWeight: 950 }}>See example businesses</Typography><Chip label="Demo" size="small" sx={{ height: 22, bgcolor: P.mist, color: P.blue, fontWeight: 900, fontSize: ".62rem" }} /></Stack><Typography sx={{ mt: .5, color: P.muted, fontSize: ".76rem" }}>Explore sample pages to see how each type of business can look.</Typography></Box>
              <Box sx={{ display: "flex", gap: 2.5, overflowX: "auto", pb: 2, scrollSnapType: "x mandatory", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>{demoBusinesses.slice(0, 8).map(item => <Box key={item.id || item.uid} sx={{ flex: "0 0 auto", width: { xs: "86%", sm: "48%", md: "32%" }, scrollSnapAlign: "start" }}><BarberCard barber={item} isMarketplace /></Box>)}</Box>
            </Box>}
          </Stack> : <Paper sx={{ p: 5, textAlign: "center", bgcolor: P.paper, borderRadius: 4, boxShadow: "none" }}><StoreIcon sx={{ color: P.muted, fontSize: 38 }} /><Typography sx={{ mt: 1, fontWeight: 950 }}>No matching professionals yet</Typography><Typography sx={{ mt: .5, color: P.muted, fontSize: ".8rem" }}>Try another service, location or category.</Typography></Paper>}
        </Container>
      </Box>

      <Box sx={{ bgcolor: P.paper, py: { xs: 8, md: 11 } }}><Container maxWidth="lg"><Grid container spacing={{ xs: 4, md: 8 }}><Grid item xs={12} md={4}><Label>Good to know</Label><Typography component="h2" sx={{ mt: 1, fontSize: { xs: "2.2rem", md: "3.3rem" }, fontWeight: 950, letterSpacing: "-.065em", lineHeight: 1 }}>Questions,<br />answered plainly.</Typography><Button component={Link} to="/contact" sx={{ mt: 2, p: 0, color: P.blue, fontWeight: 950 }}>Talk to us</Button></Grid><Grid item xs={12} md={8}>{FAQS.map(item => <Accordion key={item[0]} disableGutters elevation={0} sx={{ bgcolor: "transparent", borderBottom: "1px solid " + P.line, "&:before": { display: "none" } }}><AccordionSummary expandIcon={<ExpandIcon />} sx={{ px: 0, py: 1 }}><Typography sx={{ fontWeight: 900 }}>{item[0]}</Typography></AccordionSummary><AccordionDetails sx={{ px: 0, pb: 2.5 }}><Typography sx={{ color: P.muted, fontSize: ".85rem", lineHeight: 1.75 }}>{item[1]}</Typography></AccordionDetails></Accordion>)}</Grid></Grid></Container></Box>

      <Box sx={{ bgcolor: P.paper, pb: 5 }}><Container maxWidth="lg"><Box sx={{ bgcolor: P.coral, borderRadius: { xs: 4, md: 6 }, p: { xs: 4, sm: 6, md: 8 }, position: "relative", overflow: "hidden" }}><Typography aria-hidden="true" sx={{ position: "absolute", right: -10, top: -80, fontSize: "16rem", fontWeight: 950, color: "rgba(255,255,255,.12)", lineHeight: 1 }}>B</Typography><Grid container spacing={3} alignItems="center" sx={{ position: "relative" }}><Grid item xs={12} md={8}><Typography sx={{ fontSize: { xs: "2.2rem", md: "3.7rem" }, fontWeight: 950, letterSpacing: "-.07em", lineHeight: .98 }}>Your next booking should not depend on you checking your messages.</Typography></Grid><Grid item xs={12} md={4} sx={{ textAlign: { md: "right" } }}><Button variant="contained" onClick={() => { logFunnelEvent("home_cta_clicked", { location: "final_cta" }); navigate("/signup"); }} endIcon={<ArrowIcon />} sx={{ bgcolor: P.ink, color: "#fff", borderRadius: 99, minHeight: 56, px: 3.2, fontWeight: 950, "&:hover": { bgcolor: P.blueDark } }}>Start 90 days free</Button><Typography sx={{ mt: 1, fontSize: ".68rem", fontWeight: 800 }}>No card required</Typography></Grid></Grid></Box></Container></Box>

      <Box component="footer" sx={{ bgcolor: P.ink, color: "#fff", py: 6 }}><Container maxWidth="lg"><Grid container spacing={4}><Grid item xs={12} md={6}><BrandMark inverse /><Typography sx={{ mt: 2, maxWidth: 420, color: "rgba(255,255,255,.42)", fontSize: ".78rem", lineHeight: 1.75 }}>The working system for independent UK service professionals.</Typography></Grid><Grid item xs={6} md={2}><Label light>Platform</Label><Stack spacing={1.1} sx={{ mt: 1.5 }}>{[["Sign up", "/signup"], ["Log in", "/login"], ["Pricing", "/pricing"]].map(item => <Link key={item[0]} to={item[1]} style={{ color: "rgba(255,255,255,.58)", textDecoration: "none", fontSize: ".78rem" }}>{item[0]}</Link>)}</Stack></Grid><Grid item xs={6} md={2}><Label light>Learn</Label><Stack spacing={1.1} sx={{ mt: 1.5 }}>{[["How it works", "/how-it-works"], ["Blog", "/blog"], ["Contact", "/contact"]].map(item => <Link key={item[0]} to={item[1]} style={{ color: "rgba(255,255,255,.58)", textDecoration: "none", fontSize: ".78rem" }}>{item[0]}</Link>)}</Stack></Grid><Grid item xs={12} md={2}><Label light>Support</Label><Typography component="a" href="https://mail.google.com/mail/?view=cm&fs=1&to=info@bookrightly.co.uk" target="_blank" rel="noopener noreferrer" sx={{ display: "block", mt: 1.5, color: "rgba(255,255,255,.58)", textDecoration: "none", fontSize: ".78rem" }}>Email us</Typography></Grid></Grid><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mt: 5, pt: 3, borderTop: "1px solid rgba(255,255,255,.09)" }}><Typography sx={{ color: "rgba(255,255,255,.28)", fontSize: ".68rem" }}>© {new Date().getFullYear()} Bookrightly</Typography><Stack direction="row" spacing={2}><Link to="/terms" style={{ color: "rgba(255,255,255,.4)", fontSize: ".68rem" }}>Terms</Link><Link to="/privacy" style={{ color: "rgba(255,255,255,.4)", fontSize: ".68rem" }}>Privacy</Link></Stack></Stack></Container></Box>

      <Suspense fallback={null}><PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} /><FeatureComparisonModal open={featuresOpen} onClose={() => setFeaturesOpen(false)} /></Suspense>
    </Box>
  );
}

export default HomeRebuild;
